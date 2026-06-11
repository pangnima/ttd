import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'
import type { CourtSurface, MatchType, PersonalMatch, PersonalMatchSetScore, PersonalMatchWinner } from '@/types'

type PersonalMatchRow = Database['public']['Tables']['personal_matches']['Row']

function mapPersonalMatchRow(row: PersonalMatchRow): PersonalMatch {
    return {
        id: row.id,
        userId: row.user_id,
        opponentName: row.opponent_name,
        opponentUserId: row.opponent_user_id ?? undefined,
        opponentDominantHand: (row.opponent_dominant_hand as 'right' | 'left' | null) ?? undefined,
        partnerUserId: row.partner_user_id ?? undefined,
        partnerName: row.partner_name ?? undefined,
        partnerDominantHand: (row.partner_dominant_hand as 'right' | 'left' | null) ?? undefined,
        opponent2UserId: row.opponent2_user_id ?? undefined,
        opponent2Name: row.opponent2_name ?? undefined,
        opponent2DominantHand: (row.opponent2_dominant_hand as 'right' | 'left' | null) ?? undefined,
        playedAt: row.played_at,
        matchType: row.match_type as MatchType,
        surface: (row.surface as CourtSurface) ?? undefined,
        setScores: (row.set_scores as PersonalMatchSetScore[]) ?? [],
        winner: row.winner as PersonalMatchWinner,
        notes: row.notes ?? undefined,
        createdAt: row.created_at,
    }
}

export async function fetchPersonalMatchesByUser(userId: string): Promise<PersonalMatch[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('personal_matches')
        .select('*')
        .eq('user_id', userId)
        .order('played_at', { ascending: false })
    if (error || !data) return []
    return data.map(mapPersonalMatchRow)
}

export async function fetchPersonalMatchById(id: string): Promise<PersonalMatch | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('personal_matches')
        .select('*')
        .eq('id', id)
        .single()
    if (error || !data) return null
    return mapPersonalMatchRow(data)
}

export type PastOpponent = { name: string; hand?: 'right' | 'left' }

/**
 * 과거 개인 경기에서 직접 입력했던(클럽 회원이 아닌) 외부 인물 이름 목록.
 * 상대/파트너/상대2 세 역할 모두에서 수집하며, 이름 기준 중복 제거(최근 입력 우선)한다.
 * 개인 경기 등록 폼의 "만나본 사람" 선택에 사용.
 */
export async function fetchPastOpponents(userId: string): Promise<PastOpponent[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('personal_matches')
        .select('opponent_name, opponent_user_id, opponent_dominant_hand, partner_name, partner_user_id, partner_dominant_hand, opponent2_name, opponent2_user_id, opponent2_dominant_hand')
        .eq('user_id', userId)
        .order('played_at', { ascending: false })
    if (error || !data) return []

    // 이름 기준 distinct — 최근(먼저 조회된) 값을 우선 유지
    const map = new Map<string, PastOpponent>()
    const add = (name: string | null, userIdRef: string | null, hand: string | null) => {
        const trimmed = name?.trim()
        if (!trimmed || userIdRef) return  // 회원 선택분은 클럽 후보에 이미 존재하므로 제외
        if (map.has(trimmed)) return
        map.set(trimmed, { name: trimmed, hand: (hand as 'right' | 'left' | null) ?? undefined })
    }
    for (const row of data) {
        add(row.opponent_name, row.opponent_user_id, row.opponent_dominant_hand)
        add(row.partner_name, row.partner_user_id, row.partner_dominant_hand)
        add(row.opponent2_name, row.opponent2_user_id, row.opponent2_dominant_hand)
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
}

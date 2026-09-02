import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { PersonalMatch } from '@/types'
import { mapPersonalMatchRow } from '@/lib/personal-matches/map'

export { mapPersonalMatchRow }

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

// 이전에 만난 비회원 상대. hand·ntrp는 가장 최근 경기에 입력한 값 (자동 채움용)
export type PastOpponent = { name: string; hand?: 'right' | 'left'; ntrp?: number }

/**
 * 과거 개인 경기에서 직접 입력했던(클럽 회원이 아닌) 외부 인물 이름 목록.
 * 상대/파트너/상대2 세 역할 모두에서 수집하며, 이름 기준 중복 제거(최근 입력 우선)한다.
 * 개인 경기 등록 폼의 "만나본 사람" 자동완성 그룹에 사용 — 선택 시 손잡이·NTRP를 프리필한다.
 */
export async function fetchPastOpponents(userId: string): Promise<PastOpponent[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('personal_matches')
        .select('opponent_name, opponent_user_id, opponent_dominant_hand, opponent_ntrp, partner_name, partner_user_id, partner_dominant_hand, partner_ntrp, opponent2_name, opponent2_user_id, opponent2_dominant_hand, opponent2_ntrp')
        .eq('user_id', userId)
        .order('played_at', { ascending: false })
    if (error || !data) return []

    // 이름 기준 distinct — 최근(먼저 조회된) 값을 우선 유지
    const map = new Map<string, PastOpponent>()
    const add = (name: string | null, userIdRef: string | null, hand: string | null, ntrp: number | null) => {
        const trimmed = name?.trim()
        if (!trimmed || userIdRef) return  // 회원 선택분은 클럽 후보에 이미 존재하므로 제외
        if (map.has(trimmed)) return
        map.set(trimmed, {
            name: trimmed,
            hand: hand === 'right' || hand === 'left' ? hand : undefined,
            ntrp: ntrp != null ? Number(ntrp) : undefined,
        })
    }
    for (const row of data) {
        add(row.opponent_name, row.opponent_user_id, row.opponent_dominant_hand, row.opponent_ntrp)
        add(row.partner_name, row.partner_user_id, row.partner_dominant_hand, row.partner_ntrp)
        add(row.opponent2_name, row.opponent2_user_id, row.opponent2_dominant_hand, row.opponent2_ntrp)
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
}

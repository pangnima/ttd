'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { CourtSurface, MatchType, PersonalMatchSetScore, PersonalMatchWinner } from '@/types'

export type PersonalMatchInput = {
    opponentName: string
    opponentUserId?: string  // 클럽 회원 선택 시 설정, 외부 상대는 undefined
    opponentDominantHand?: 'right' | 'left'  // 외부 상대 직접 입력 시 손잡이
    // ── 복식 전용 (단식이면 무시되고 NULL 저장) ──
    partnerName?: string
    partnerUserId?: string
    partnerDominantHand?: 'right' | 'left'
    opponent2Name?: string
    opponent2UserId?: string
    opponent2DominantHand?: 'right' | 'left'
    playedAt: string
    matchType: MatchType
    surface?: CourtSurface
    setScores: PersonalMatchSetScore[]
    winner: PersonalMatchWinner
    notes?: string
}

const DOUBLES_TYPES: MatchType[] = ['men_doubles', 'women_doubles', 'mixed_doubles']

function isDoubles(matchType: MatchType): boolean {
    return DOUBLES_TYPES.includes(matchType)
}

function validateInput(input: PersonalMatchInput): string | null {
    if (!input.opponentName.trim()) return '상대 이름을 입력해주세요.'
    if (!input.playedAt) return '경기 날짜를 입력해주세요.'
    if (!['singles', 'men_doubles', 'women_doubles', 'mixed_doubles'].includes(input.matchType)) {
        return '올바른 경기 타입을 선택해주세요.'
    }
    if (isDoubles(input.matchType)) {
        if (!input.partnerName?.trim() && !input.partnerUserId) return '복식은 내 파트너를 입력해주세요.'
        if (!input.opponent2Name?.trim() && !input.opponent2UserId) return '복식은 상대팀 2번째 선수를 입력해주세요.'
    }
    if (!['me', 'opponent', 'draw'].includes(input.winner)) return '결과를 선택해주세요.'
    return null
}

/**
 * insert/update 공통: 단식이면 복식 컬럼을 모두 NULL로, 복식이면 입력값을 매핑한 행 데이터 생성.
 */
function buildPersonalMatchRow(input: PersonalMatchInput) {
    const doubles = isDoubles(input.matchType)
    return {
        opponent_name: input.opponentName.trim(),
        opponent_user_id: input.opponentUserId ?? null,
        opponent_dominant_hand: input.opponentDominantHand ?? null,
        partner_name: doubles ? (input.partnerName?.trim() || null) : null,
        partner_user_id: doubles ? (input.partnerUserId ?? null) : null,
        partner_dominant_hand: doubles ? (input.partnerDominantHand ?? null) : null,
        opponent2_name: doubles ? (input.opponent2Name?.trim() || null) : null,
        opponent2_user_id: doubles ? (input.opponent2UserId ?? null) : null,
        opponent2_dominant_hand: doubles ? (input.opponent2DominantHand ?? null) : null,
        played_at: input.playedAt,
        match_type: input.matchType,
        surface: input.surface ?? null,
        set_scores: input.setScores,
        winner: input.winner,
        notes: input.notes?.trim() || null,
    }
}

export async function createPersonalMatchAction(
    input: PersonalMatchInput,
): Promise<{ error: string | null }> {
    const validationError = validateInput(input)
    if (validationError) return { error: validationError }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const { error } = await supabase.from('personal_matches').insert({
        user_id: user.id,
        ...buildPersonalMatchRow(input),
    })

    if (error) return { error: '경기 저장에 실패했습니다.' }

    revalidatePath('/me/analytics')
    revalidatePath('/me/personal-matches')
    return { error: null }
}

export async function updatePersonalMatchAction(
    id: string,
    input: PersonalMatchInput,
): Promise<{ error: string | null }> {
    const validationError = validateInput(input)
    if (validationError) return { error: validationError }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const { error } = await supabase
        .from('personal_matches')
        .update(buildPersonalMatchRow(input))
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) return { error: '경기 수정에 실패했습니다.' }

    revalidatePath('/me/analytics')
    revalidatePath('/me/personal-matches')
    return { error: null }
}

export async function deletePersonalMatchAction(
    id: string,
): Promise<{ error: string | null }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const { error } = await supabase
        .from('personal_matches')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) return { error: '경기 삭제에 실패했습니다.' }

    revalidatePath('/me/analytics')
    revalidatePath('/me/personal-matches')
    return { error: null }
}

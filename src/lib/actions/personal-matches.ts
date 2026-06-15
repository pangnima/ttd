'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { CourtSurface, MatchType, PersonalMatchSetScore } from '@/types'
import { resolveMatchWinner } from '@/lib/personal-matches/winner'

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
    playedTime?: string  // 'HH:MM' (선택)
    matchType: MatchType
    surface?: CourtSurface
    setScores: PersonalMatchSetScore[]
    opponentNtrp?: number  // 상대(팀) 추정 난이도 (1.0~7.0, 선택) — 개인 레이팅 계산용
    // winner는 입력받지 않고 setScores로부터 자동 판정한다.
    notes?: string
}

const DOUBLES_TYPES: MatchType[] = ['men_doubles', 'women_doubles', 'mixed_doubles']

function isDoubles(matchType: MatchType): boolean {
    return DOUBLES_TYPES.includes(matchType)
}

function isValidScore(n: number): boolean {
    return Number.isInteger(n) && n >= 0 && n <= 99
}

function validateInput(input: PersonalMatchInput): string | null {
    if (!input.opponentName.trim()) return '상대 이름을 입력해주세요.'
    if (!input.playedAt) return '경기 날짜를 입력해주세요.'
    if (!input.playedTime) return '경기 시각을 입력해주세요.'
    if (!/^\d{2}:\d{2}$/.test(input.playedTime)) return '경기 시각 형식이 올바르지 않습니다.'
    if (!['singles', 'men_doubles', 'women_doubles', 'mixed_doubles'].includes(input.matchType)) {
        return '올바른 경기 타입을 선택해주세요.'
    }
    if (isDoubles(input.matchType)) {
        if (!input.partnerName?.trim() && !input.partnerUserId) return '복식은 내 파트너를 입력해주세요.'
        if (!input.opponent2Name?.trim() && !input.opponent2UserId) return '복식은 상대팀 2번째 선수를 입력해주세요.'
    }
    // 상대 수준(선택): 입력 시 1.0~7.0 범위
    if (input.opponentNtrp != null && (input.opponentNtrp < 1 || input.opponentNtrp > 7)) {
        return '상대 수준은 1.0~7.0 범위로 입력해주세요.'
    }
    // 세트 검증: 1개 이상, 각 세트 점수가 0~99 정수, 0-0(미입력) 세트 금지
    if (!input.setScores.length) return '세트 스코어를 입력해주세요.'
    for (const s of input.setScores) {
        if (!isValidScore(s.me) || !isValidScore(s.opp)) return '세트 스코어를 올바르게 입력해주세요.'
        if (s.me === 0 && s.opp === 0) return '0-0 세트는 저장할 수 없습니다.'
    }
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
        played_time: input.playedTime || null,
        match_type: input.matchType,
        surface: input.surface ?? null,
        opponent_ntrp: input.opponentNtrp ?? null,
        set_scores: input.setScores,
        // winner는 세트 점수로부터 자동 판정 (수동 선택 제거)
        winner: resolveMatchWinner(input.setScores),
        notes: input.notes?.trim() || null,
    }
}

/**
 * 여러 세트를 각각 개별 경기로 분리 저장한다.
 * 신규 등록 시 입력한 세트마다 하나의 PersonalMatchInput(단일 세트)을 받아 일괄 INSERT.
 */
export async function createPersonalMatchesAction(
    inputs: PersonalMatchInput[],
): Promise<{ error: string | null }> {
    if (!inputs.length) return { error: '저장할 경기가 없습니다.' }
    for (const input of inputs) {
        const validationError = validateInput(input)
        if (validationError) return { error: validationError }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const rows = inputs.map((input) => ({
        user_id: user.id,
        ...buildPersonalMatchRow(input),
    }))
    const { error } = await supabase.from('personal_matches').insert(rows)

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

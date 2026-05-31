'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { CourtSurface, MatchType, PersonalMatchSetScore, PersonalMatchWinner } from '@/types'

export type PersonalMatchInput = {
    opponentName: string
    opponentUserId?: string  // 클럽 회원 선택 시 설정, 외부 상대는 undefined
    playedAt: string
    matchType: MatchType
    surface?: CourtSurface
    setScores: PersonalMatchSetScore[]
    winner: PersonalMatchWinner
    notes?: string
}

function validateInput(input: PersonalMatchInput): string | null {
    if (!input.opponentName.trim()) return '상대 이름을 입력해주세요.'
    if (!input.playedAt) return '경기 날짜를 입력해주세요.'
    if (!['singles', 'men_doubles', 'women_doubles', 'mixed_doubles'].includes(input.matchType)) {
        return '올바른 경기 타입을 선택해주세요.'
    }
    if (!['me', 'opponent', 'draw'].includes(input.winner)) return '결과를 선택해주세요.'
    return null
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
        opponent_name: input.opponentName.trim(),
        opponent_user_id: input.opponentUserId ?? null,
        played_at: input.playedAt,
        match_type: input.matchType,
        surface: input.surface ?? null,
        set_scores: input.setScores,
        winner: input.winner,
        notes: input.notes?.trim() || null,
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
        .update({
            opponent_name: input.opponentName.trim(),
            opponent_user_id: input.opponentUserId ?? null,
            played_at: input.playedAt,
            match_type: input.matchType,
            surface: input.surface ?? null,
            set_scores: input.setScores,
            winner: input.winner,
            notes: input.notes?.trim() || null,
        })
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

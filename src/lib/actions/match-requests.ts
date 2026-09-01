'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { CourtSurface, PersonalMatchSetScore } from '@/types'
import { validatePersonalMatchInput } from '@/lib/personal-matches/validate-input'
import { recomputePersonalNtrp } from '@/lib/actions/personal-matches'

/**
 * 상호 확인 대진 요청 입력 (v1: 회원 간 단식 전용).
 * opponentName은 검증·표시용일 뿐 저장되지 않는다 — 확정 시 RPC가 users에서 실명을 가져온다.
 * 상대 NTRP도 입력받지 않는다 — 수락 시 RPC가 상대의 레이팅에서 파생한다.
 */
export type MatchRequestInput = {
    opponentUserId: string
    opponentName: string
    playedAt: string
    playedTime: string  // 'HH:MM'
    surface: CourtSurface
    setScores: PersonalMatchSetScore[]  // 요청자 관점
    notes?: string
}

export async function createMatchRequestAction(
    input: MatchRequestInput,
): Promise<{ error: string | null }> {
    // 자유 기록과 동일한 규칙으로 검증하되, 상대 NTRP는 수락 시 서버 파생이므로 생략
    const validationError = validatePersonalMatchInput(
        { ...input, matchType: 'singles' },
        { skipNtrp: true },
    )
    if (validationError) return { error: validationError }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }
    if (input.opponentUserId === user.id) return { error: '자기 자신에게는 요청할 수 없습니다.' }

    const { error } = await supabase.from('match_requests').insert({
        requester_id: user.id,
        opponent_user_id: input.opponentUserId,
        played_at: input.playedAt,
        played_time: input.playedTime,
        surface: input.surface,
        set_scores: input.setScores,
        notes: input.notes?.trim() || null,
    })

    if (error) {
        // 부분 유니크 인덱스(pending 중복) 위반
        if (error.code === '23505') return { error: '같은 상대·같은 일시로 이미 대기 중인 요청이 있습니다.' }
        // RLS with check(게스트/탈퇴 상대) 또는 CHECK 제약 위반
        if (error.code === '42501' || error.code === '23514') return { error: '요청할 수 없는 상대입니다.' }
        return { error: '확인 요청 전송에 실패했습니다.' }
    }

    revalidatePath('/me/match-requests')
    return { error: null }
}

export async function cancelMatchRequestAction(id: string): Promise<{ error: string | null }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    // pending에서만 취소 가능 — 멱등 가드 (이미 수락/거절됐으면 0건)
    const { data, error } = await supabase
        .from('match_requests')
        .update({ status: 'canceled', responded_at: new Date().toISOString() })
        .eq('id', id)
        .eq('requester_id', user.id)
        .eq('status', 'pending')
        .select('id')

    if (error) return { error: '요청 취소에 실패했습니다.' }
    if (!data?.length) return { error: '이미 처리된 요청입니다.' }

    revalidatePath('/me/match-requests')
    return { error: null }
}

export async function rejectMatchRequestAction(id: string): Promise<{ error: string | null }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const { data, error } = await supabase
        .from('match_requests')
        .update({ status: 'rejected', responded_at: new Date().toISOString() })
        .eq('id', id)
        .eq('opponent_user_id', user.id)
        .eq('status', 'pending')
        .select('id')

    if (error) return { error: '요청 거절에 실패했습니다.' }
    if (!data?.length) return { error: '이미 처리된 요청입니다.' }

    revalidatePath('/me/match-requests')
    return { error: null }
}

/** RPC가 raise하는 식별자 → 사용자 안내 문구 */
const ACCEPT_ERROR_MESSAGES: Array<[string, string]> = [
    ['request_not_found', '존재하지 않는 요청입니다.'],
    ['request_not_pending', '이미 처리된 요청입니다.'],
    ['not_request_opponent', '이 요청을 수락할 권한이 없습니다.'],
    ['requester_deleted', '요청자가 탈퇴하여 수락할 수 없습니다.'],
]

export async function acceptMatchRequestAction(id: string): Promise<{ error: string | null }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    // 검증 → 양측 관점 personal_matches 2행 생성 → 상태 전이 (RPC 한 트랜잭션)
    const { error } = await supabase.rpc('accept_match_request', { p_request_id: id })

    if (error) {
        const known = ACCEPT_ERROR_MESSAGES.find(([key]) => error.message.includes(key))
        return { error: known ? known[1] : '요청 수락에 실패했습니다.' }
    }

    // 수락자 본인 캐시 갱신 (요청자 캐시는 lazy — 표시가 온더플라이 재생이라 정합성 유지,
    // 요청자의 다음 경기 CUD에서 자동 재계산된다)
    await recomputePersonalNtrp(user.id)
    revalidatePath('/me/match-requests')
    revalidatePath('/me/personal-matches')
    revalidatePath('/me/analytics')
    return { error: null }
}

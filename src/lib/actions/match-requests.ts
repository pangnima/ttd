'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

import { recomputePersonalNtrp } from '@/lib/actions/personal-matches'

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

    revalidatePath('/match-rooms')
    return { error: null }
}

/**
 * 요청 거절 — 대표와 회원 참가자(파트너·상대2)가 함께 쓴다(0056).
 * 종전에는 테이블 직접 UPDATE에 opponent_user_id로 좁혀, 참가자가 부르면 0행이 조용히 지나가고
 * "이미 처리된 요청입니다"로 오표시됐다. 복식은 네 자리가 다 있어야 성립하므로 한 명의 거절이 요청 전체를 끝낸다.
 */
export async function rejectMatchRequestAction(id: string): Promise<{ error: string | null }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const { error } = await supabase.rpc('reject_match_request', { p_request_id: id })
    if (error) {
        const known = RESPOND_ERROR_MESSAGES.find(([key]) => error.message.includes(key))
        return { error: known ? known[1] : '요청 거절에 실패했습니다.' }
    }

    revalidatePath('/match-rooms')
    return { error: null }
}

/** 참여 응답 RPC(accept/reject/respond)가 raise하는 식별자 → 안내 문구 */
const RESPOND_ERROR_MESSAGES: Array<[string, string]> = [
    ['request_not_found', '존재하지 않는 요청입니다.'],
    ['request_not_pending', '이미 처리된 요청입니다.'],
    ['participation_already_responded', '이미 응답한 요청입니다.'],
    ['not_request_participant', '이 요청에 응답할 권한이 없습니다.'],
    ['not_request_opponent', '이 요청을 수락할 권한이 없습니다.'],
    ['requester_deleted', '요청자가 탈퇴하여 수락할 수 없습니다.'],
    ['no_pending_requests', '응답할 요청이 없습니다.'],
]

/**
 * 회원 참가자(복식 파트너·상대2)의 참여 수락/거절 (0056).
 * 방 밖 요청은 회원 좌석 전원이 수락해야 기록이 생긴다 — RPC는 내가 마지막 수락자였는지를 돌려주고,
 * 그때만 통계 캐시를 다시 계산한다(중간 수락에서 매번 도는 것은 낭비다).
 */
export async function respondRequestParticipationAction(
    id: string, accept: boolean,
): Promise<{ error: string | null }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const { data, error } = await supabase.rpc('respond_request_participation', {
        p_request_id: id, p_accept: accept,
    })
    if (error) {
        const known = RESPOND_ERROR_MESSAGES.find(([key]) => error.message.includes(key))
        return { error: known ? known[1] : '응답 처리에 실패했습니다.' }
    }

    revalidatePath('/match-rooms')
    if (data === true) {
        await recomputePersonalNtrp(user.id)
        revalidatePath('/me/personal-matches')
        revalidatePath(`/profile/${user.id}`)
    }
    return { error: null }
}

/**
 * 로테이션 세션 단위 일괄 응답 (0056).
 * 한 세션에서 같은 회원이 게임마다 대표이거나 파트너일 수 있어, 요청별로 쪼개면
 * 같은 세션에 [수락]을 역할을 바꿔가며 여러 번 눌러야 한다. RPC가 두 축을 한 번에 흡수한다.
 */
export async function respondRotationParticipationAction(
    sessionId: string, accept: boolean,
): Promise<{ error: string | null }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const { error } = await supabase.rpc('respond_rotation_participation', {
        p_rotation_session_id: sessionId, p_accept: accept,
    })
    if (error) {
        const known = RESPOND_ERROR_MESSAGES.find(([key]) => error.message.includes(key))
        return { error: known ? known[1] : '응답 처리에 실패했습니다.' }
    }

    await recomputePersonalNtrp(user.id)
    revalidatePath('/match-rooms')
    revalidatePath('/me/personal-matches')
    revalidatePath(`/profile/${user.id}`)
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

    // 대표의 참여 수락. 방 밖 복식이면 회원 참가자가 모두 수락해야 기록이 생기므로(0056)
    // 이 호출만으로는 아직 personal_matches가 만들어지지 않을 수 있다.
    const { error } = await supabase.rpc('accept_match_request', { p_request_id: id })

    if (error) {
        const known = ACCEPT_ERROR_MESSAGES.find(([key]) => error.message.includes(key))
        return { error: known ? known[1] : '요청 수락에 실패했습니다.' }
    }

    // 수락자 본인 캐시 갱신 (요청자 캐시는 lazy — 표시가 온더플라이 재생이라 정합성 유지,
    // 요청자의 다음 경기 CUD에서 자동 재계산된다)
    await recomputePersonalNtrp(user.id)
    revalidatePath('/match-rooms')
    revalidatePath('/me/personal-matches')
    revalidatePath(`/profile/${user.id}`)
    return { error: null }
}

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { CourtSurface, MatchType, PersonalMatchSetScore } from '@/types'
import { isDoublesMatchType, validatePersonalMatchInput, type NtrpField } from '@/lib/personal-matches/validate-input'
import { recomputePersonalNtrp } from '@/lib/actions/personal-matches'

/**
 * 상호 확인 대진 요청 입력 (단식 + 페어 고정 복식).
 * opponentUserId는 상대팀 대표 확인자(회원). 복식이면 파트너·상대2를 함께 저장하되,
 * 그들이 회원이어도 기록은 요청자/대표 2행만 생성된다 (대표 확인 모델).
 * 회원 참가자의 NTRP는 수락 시 RPC가 파생하므로 입력받지 않고, 비회원 상대2 NTRP만 필수.
 * setScores는 선택 — 등록 폼은 세트 없이 요청하며, 수락 시 양측에 결과 미확정(세트 없음)으로 기록된다.
 */
export type MatchRequestInput = {
    matchType: MatchType
    opponentUserId: string
    opponentName: string
    opponentDominantHand?: 'right' | 'left'
    // ── 복식 전용 ──
    partnerName?: string
    partnerUserId?: string
    partnerDominantHand?: 'right' | 'left'
    partnerNtrp?: number
    opponent2Name?: string
    opponent2UserId?: string
    opponent2DominantHand?: 'right' | 'left'
    opponent2Ntrp?: number
    playedAt: string
    playedTime: string  // 'HH:MM'
    surface: CourtSurface
    setScores?: PersonalMatchSetScore[]  // 요청자 관점 (생략 = 미확정)
    notes?: string
    courtName?: string  // 선택, ≤40자 — 수락 시 양측 기록에 복사
}

/** 확인 요청 생성. 방에 올리는 일은 하지 않는다 — 매칭은 createMatchRoomAction이 연다(Week 39). */
export async function createMatchRequestAction(
    input: MatchRequestInput,
): Promise<{ error: string | null }> {
    const doubles = isDoublesMatchType(input.matchType)
    const setScores = input.setScores ?? []
    // 자유 기록과 동일한 규칙으로 검증하되, 회원 참가자의 NTRP는 수락 시 서버 파생이므로 생략
    const skipNtrpFor: NtrpField[] = ['opponent']
    if (input.partnerUserId) skipNtrpFor.push('partner')
    if (input.opponent2UserId) skipNtrpFor.push('opponent2')
    const validationError = validatePersonalMatchInput({ ...input, setScores }, { skipNtrpFor })
    if (validationError) return { error: validationError }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }
    if (input.opponentUserId === user.id) return { error: '자기 자신에게는 요청할 수 없습니다.' }

    // 회원 참가자 중복 방지 (나·대표·파트너·상대2)
    const memberIds = [user.id, input.opponentUserId, input.partnerUserId, input.opponent2UserId]
        .filter((id): id is string => !!id)
    if (new Set(memberIds).size !== memberIds.length) return { error: '같은 회원을 두 번 지정할 수 없습니다.' }

    // 요청 원장 INSERT + (복식이면) 참가자 2행을 원자적으로 생성해야 하므로 RPC 경유(직접 INSERT 정책 폐지).
    const { error } = await supabase.rpc('create_match_request', {
        p_opponent_user_id: input.opponentUserId,
        p_played_at: input.playedAt,
        p_played_time: input.playedTime,
        p_match_type: input.matchType,
        p_surface: input.surface,
        p_notes: input.notes?.trim() || undefined,
        p_court_name: input.courtName?.trim() || undefined,
        p_set_scores: setScores,
        p_partner: doubles ? {
            user_id: input.partnerUserId ?? null,
            name: input.partnerName?.trim() || null,
            dominant_hand: input.partnerDominantHand ?? null,
            ntrp: input.partnerNtrp ?? null,
        } : undefined,
        p_opponent2: doubles ? {
            user_id: input.opponent2UserId ?? null,
            name: input.opponent2Name?.trim() || null,
            dominant_hand: input.opponent2DominantHand ?? null,
            ntrp: input.opponent2Ntrp ?? null,
        } : undefined,
    })

    if (error) {
        // 부분 유니크 인덱스(pending 중복) 위반
        if (error.code === '23505') return { error: '같은 상대·같은 일시로 이미 대기 중인 요청이 있습니다.' }
        if (error.message.includes('invalid_opponent')) return { error: '요청할 수 없는 상대입니다.' }
        if (error.message.includes('doubles_players_required')) return { error: '복식은 파트너와 상대팀 2번째 선수를 모두 입력해주세요.' }
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

    revalidatePath('/me/match-requests')
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

    revalidatePath('/me/match-requests')
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
    revalidatePath('/me/match-requests')
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
    revalidatePath('/me/match-requests')
    revalidatePath('/me/personal-matches')
    revalidatePath(`/profile/${user.id}`)
    return { error: null }
}

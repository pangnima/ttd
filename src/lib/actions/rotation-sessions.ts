'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { CourtSurface, MatchType, RotationPoolPlayer } from '@/types'
import type { RotationGamePayload } from '@/lib/personal-matches/rotation'
import { isDoublesMatchType, validateCourtName, validateSetScores } from '@/lib/personal-matches/validate-input'
import { DIRECT_RECORD_MEMBER_ERROR, requiresRoom } from '@/lib/personal-matches/direct-record'
import { recomputePersonalNtrp } from '@/lib/actions/personal-matches'
import { revalidateRoomList, revalidateRoomPaths } from '@/lib/match-rooms/revalidate'

/**
 * 로테이션(파트너 교체) 복식 세션 — 등록 시 선수 풀만 저장(rotation_sessions),
 * 게임(팀 구성+세트)은 카드 '결과 입력'에서 finalize RPC로 게임별 personal_matches 행으로 분해한다.
 * 세션 자체는 어떤 통계에도 잡히지 않는다.
 */

type ActionResult = { error: string | null; stale?: boolean }

export type RotationSessionInput = {
    playedAt: string
    playedTime: string  // 'HH:MM'
    matchType: MatchType
    surface: CourtSurface
    notes?: string
    courtName?: string  // 선택, ≤40자 — finalize 시 모든 게임에 상속
    players: RotationPoolPlayer[]  // 나 제외, 3명 이상
}

const MAX_GAMES = 20

function validatePlayer(p: RotationPoolPlayer): string | null {
    if (!p.name.trim()) return '참가자 이름을 입력해주세요.'
    if (!p.userId && !p.hand) return '비회원 참가자는 손잡이를 선택해주세요.'
    if (p.hand != null && !['right', 'left'].includes(p.hand)) return '손잡이 값이 올바르지 않습니다.'
    // 풀 전원 NTRP 필수 — 게임에서 파트너/상대 어느 역할이든 개인 레이팅 계산에 쓰인다 (페어 고정 폼과 동일 규칙)
    if (p.ntrp == null) return '참가자 NTRP를 입력해주세요.'
    if (!Number.isFinite(p.ntrp) || p.ntrp < 1 || p.ntrp > 7) return 'NTRP는 1.0~7.0 범위로 입력해주세요.'
    return null
}

function cleanPlayer(p: RotationPoolPlayer): RotationPoolPlayer {
    return {
        name: p.name.trim(),
        ...(p.userId ? { userId: p.userId } : {}),
        ...(p.hand ? { hand: p.hand } : {}),
        ...(p.ntrp != null ? { ntrp: p.ntrp } : {}),
    }
}

/** 세션 저장(방 밖 일정). 방에 올리는 일은 하지 않는다 — 매칭은 createMatchRoomAction이 연다(Week 39). */
export async function createRotationSessionAction(input: RotationSessionInput): Promise<ActionResult> {
    if (!isDoublesMatchType(input.matchType)) return { error: '로테이션은 복식에서만 등록할 수 있습니다.' }
    if (!input.playedAt) return { error: '경기 날짜를 입력해주세요.' }
    if (!/^\d{2}:\d{2}$/.test(input.playedTime)) return { error: '경기 시각을 입력해주세요.' }
    if (!input.surface) return { error: '코트 표면을 선택해주세요.' }
    const courtNameError = validateCourtName(input.courtName)
    if (courtNameError) return { error: courtNameError }
    // 방 밖 세션은 풀이 곧 참가자 명단이다 — 빈 풀 세션은 매칭(방)의 몫이므로 여기서는 3명을 요구한다
    if (input.players.length < 3) return { error: '참가자를 3명 이상 등록해주세요.' }
    // 회원이 끼면 매칭 룸에서 기록한다(Week 39) — 방 밖 세션은 비회원끼리의 로테이션 전용
    if (requiresRoom(input.players)) return { error: DIRECT_RECORD_MEMBER_ERROR }
    for (const p of input.players) {
        const err = validatePlayer(p)
        if (err) return { error: err }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const { data: inserted, error } = await supabase.from('rotation_sessions').insert({
        user_id: user.id,
        played_at: input.playedAt,
        played_time: input.playedTime,
        match_type: input.matchType,
        surface: input.surface,
        notes: input.notes?.trim() || null,
        court_name: input.courtName?.trim() || null,
        players: input.players.map(cleanPlayer),
    }).select('id').single()
    if (error || !inserted) return { error: '로테이션 세션 저장에 실패했습니다.' }

    revalidatePath('/me/personal-matches')
    return { error: null }
}

/** RPC 식별자 → 안내 문구 */
const PLAN_ERROR_MESSAGES: Array<[string, string]> = [
    ['session_not_found', '삭제되었거나 종료된 일정입니다.'],
    ['plan_already_responded', '이미 응답했거나 참여 대상이 아닌 일정입니다.'],
]

/**
 * 로테이션 **일정** 초대에 대한 참여 응답 (0057).
 * 거절하면 나만 선수 풀에서 빠지고 일정 자체는 남는다 — 확인 요청(한 명의 거절 = 요청 종료)과 다르다.
 *
 * ⚠ 0056의 `respondRotationParticipationAction`(match-requests.ts)과 혼동 금지.
 * 그쪽은 결과 입력 후 생긴 **게임 파생 요청들**에 대한 일괄 응답이다.
 *
 * personal_matches를 만들지 않으므로 개인 통계·레이팅 경로는 재검증하지 않는다.
 */
export async function respondRotationPlanAction(sessionId: string, accept: boolean): Promise<ActionResult> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const { error } = await supabase.rpc('respond_rotation_plan', {
        p_session_id: sessionId,
        p_accept: accept,
    })
    if (error) {
        const known = PLAN_ERROR_MESSAGES.find(([key]) => error.message.includes(key))
        return { error: known ? known[1] : '응답에 실패했습니다.' }
    }

    revalidatePath('/me/personal-matches')
    return { error: null }
}

/** 풀 편집 RPC가 raise하는 식별자 → 사용자 안내 문구 */
const POOL_ERROR_MESSAGES: Array<[string, string]> = [
    ['session_not_found', '삭제되었거나 종료된 일정입니다.'],
    ['room_session_invite_unsupported', '매칭 리스트에 올린 경기는 방 비밀번호로 입장해 참가합니다.'],
    ['not_session_participant', '참여를 수락한 사람만 참가자를 초대할 수 있습니다.'],
    ['not_session_owner', '참가자를 빼는 것은 경기를 만든 사람만 할 수 있습니다.'],
    ['already_in_pool', '이미 참가자로 등록된 회원입니다.'],
    ['invalid_player', '초대할 수 없는 회원입니다.'],
    ['ntrp_missing', 'NTRP가 없는 회원은 초대할 수 없습니다.'],
    ['not_in_pool', '참가자 명단에 없는 회원입니다.'],
]

function poolError(message: string): string {
    return POOL_ERROR_MESSAGES.find(([key]) => message.includes(key))?.[1] ?? '참가자 변경에 실패했습니다.'
}

/**
 * 로테이션 일정의 선수 풀에 회원을 초대한다 (0058).
 * 좌석 생성과 재초대(거절 → 다시 대기) 복귀는 0057 트리거가 대신하므로 여기서는 RPC만 부른다.
 * `respondRotationPlanAction`과 같은 이유로 통계·레이팅 경로는 재검증하지 않는다.
 */
export async function addRotationSessionPlayerAction(sessionId: string, userId: string): Promise<ActionResult> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const { error } = await supabase.rpc('add_rotation_session_player', {
        p_session_id: sessionId,
        p_user_id: userId,
    })
    if (error) return { error: poolError(error.message) }

    revalidatePath('/me/personal-matches')
    return { error: null }
}

/** 선수 풀에서 회원을 뺀다 — 경기를 만든 사람만 (0058). 본인이 빠지는 길은 '거절'이다. */
export async function removeRotationSessionPlayerAction(sessionId: string, userId: string): Promise<ActionResult> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const { error } = await supabase.rpc('remove_rotation_session_player', {
        p_session_id: sessionId,
        p_user_id: userId,
    })
    if (error) return { error: poolError(error.message) }

    revalidatePath('/me/personal-matches')
    return { error: null }
}

export async function deleteRotationSessionAction(id: string): Promise<ActionResult> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const { data, error } = await supabase
        .from('rotation_sessions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .select('id, room_id')
    if (error) return { error: '세션 삭제에 실패했습니다.' }
    if (!data?.length) return { error: '이미 삭제되었거나 존재하지 않는 세션입니다.' }

    // 미확정 세션이 리스트에 올라가 있었다면 방도 내린다. 단 참가자가 이미 올린 게임이 있으면 방을 남긴다 —
    // room_id는 on delete set null이라 방을 지우면 남의 기록에서 방 링크가 조용히 끊긴다(0050).
    const roomId = data[0].room_id
    if (roomId) {
        const { count } = await supabase
            .from('personal_matches')
            .select('id', { count: 'exact', head: true })
            .eq('room_id', roomId)
        if (!count) await supabase.from('match_rooms').delete().eq('id', roomId).eq('host_user_id', user.id)
        revalidateRoomPaths(roomId)
    }

    revalidatePath('/me/personal-matches')
    revalidateRoomList()
    return { error: null }
}

/** RPC가 raise하는 식별자 → 사용자 안내 문구 */
const FINALIZE_ERROR_MESSAGES: Array<[string, string]> = [
    ['not_session_participant', '참여를 수락한 사람만 결과를 입력할 수 있습니다.'],
    ['participant_not_in_room', '참여를 거절했거나 이 경기의 참가자가 아닌 사람은 게임에 넣을 수 없습니다.'],
    ['duplicate_players', '한 게임에 같은 사람을 두 번 넣을 수 없습니다.'],
    ['session_not_found', '게임 입력이 종료되었거나 삭제된 경기입니다.'],
    ['invalid_games', '게임 구성을 확인해주세요. (파트너·상대1·상대2 필수)'],
    ['invalid_set_scores', '게임 스코어를 올바르게 입력해주세요. (게임당 스코어 1줄)'],
    // 0064 — 전원 수락 게이트와 낙관적 선점
    ['session_seats_pending', '아직 참여를 수락하지 않은 참가자가 있어 결과를 입력할 수 없습니다. 응답이 없으면 참가자 편집에서 명단에서 빼고 게스트로 기록할 수 있습니다.'],
    ['session_games_changed', '다른 참가자가 먼저 게임을 등록했습니다. 목록을 확인한 뒤 다시 저장해주세요.'],
]

/**
 * 게임별 기록으로 분해 저장 (RPC 한 트랜잭션).
 * 방 세션이면 방에 참가한 회원 누구나 자기 기준으로 입력할 수 있고, 상대팀에 회원이 있으면
 * 상호 확인 경기로 만들어져 회원 참가자 전원의 확인 후 확정된다(0060). 세션 행은 호스트가 닫을 때까지 남는다(0050).
 */
export async function finalizeRotationSessionAction(
    sessionId: string,
    games: RotationGamePayload[],
    /**
     * 빌더가 화면에 띄운 '새 게임은 N번부터'의 N (0064). 서버의 다음 번호와 다르면 그 사이에
     * 다른 참가자가 등록한 것이므로 거부한다 — 조용히 이어붙이면 같은 게임이 두 번 들어간다.
     * 넘기지 않으면 검사하지 않는다(옛 2인자 호출 호환).
     */
    expectedSeq?: number,
): Promise<ActionResult> {
    if (games.length < 1) return { error: '게임을 1개 이상 추가해주세요.' }
    if (games.length > MAX_GAMES) return { error: `게임은 최대 ${MAX_GAMES}개까지 등록할 수 있습니다.` }
    for (const g of games) {
        for (const p of [g.partner, g.opp1, g.opp2]) {
            const err = validatePlayer(p)
            if (err) return { error: err }
        }
        // 게임 1건 = 스코어 1줄 (클라 validateRotationGames·RPC와 3중 방어)
        const setError = validateSetScores(g.sets, { max: 1 })
        if (setError) return { error: setError }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const payload = games.map((g) => ({
        partner: cleanPlayer(g.partner),
        opp1: cleanPlayer(g.opp1),
        opp2: cleanPlayer(g.opp2),
        sets: g.sets.map((s) => ({
            me: s.me,
            opp: s.opp,
            ...(s.myAd ? { myAd: s.myAd } : {}),
            ...(s.oppAd ? { oppAd: s.oppAd } : {}),
        })),
    }))
    // 방 재검증에 쓸 room_id — 세션은 방 참가자도 읽을 수 있다(0050 RLS)
    const { data: session } = await supabase
        .from('rotation_sessions').select('room_id').eq('id', sessionId).maybeSingle()

    const { error } = await supabase.rpc('finalize_rotation_session', {
        p_session_id: sessionId,
        p_games: payload,
        ...(expectedSeq != null ? { p_expected_seq: expectedSeq } : {}),
    })
    if (error) {
        const known = FINALIZE_ERROR_MESSAGES.find(([key]) => error.message.includes(key))
        // 선점(0064)에 밀린 것은 내 화면이 낡은 것이다 — 팝업 훅이 refresh해 '등록된 게임' 목록을 갱신한다
        const stale = known?.[0] === 'session_games_changed'
        return { error: known ? known[1] : '게임 저장에 실패했습니다.', ...(stale ? { stale } : {}) }
    }

    await recomputePersonalNtrp(user.id)
    revalidatePath('/me/personal-matches')
    revalidatePath(`/profile/${user.id}`)
    revalidateRoomList()
    revalidateRoomPaths(session?.room_id)
    return { error: null }
}

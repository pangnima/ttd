'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { validateRoomPassword } from '@/lib/match-rooms/password'
import { revalidateRoomList, revalidateRoomPaths } from '@/lib/match-rooms/revalidate'
import { listRecordAsRoom } from '@/lib/match-rooms/create-room'
import { sourceKindOf, validateCreateMatchRoomInput, type CreateMatchRoomInput } from '@/lib/match-rooms/create-match'

/**
 * 매칭 리스트(매칭 룸) 쓰기 — 매칭 만들기·입장·초대 응답·방장 관리·방 게임 등록.
 * 비밀번호 검증과 멤버 전이는 전부 SECURITY DEFINER RPC(0046·0048·0065) 안에서 하고,
 * 여기서는 사용자 문구로 번역만 한다.
 */

type ActionResult = { error: string | null }

/** RPC가 raise하는 식별자 → 사용자 안내 문구 */
const ROOM_ERROR_MESSAGES: Array<[string, string]> = [
    ['not_authenticated', '로그인이 필요합니다.'],
    ['room_not_found', '존재하지 않거나 리스트에서 내려간 경기입니다.'],
    ['wrong_password', '비밀번호가 일치하지 않습니다.'],
    ['invalid_password', '비밀번호는 4~20자, 공백 없이 입력해주세요.'],
    ['invite_not_found', '처리할 초대가 없습니다.'],
    ['not_host', '방장만 할 수 있습니다.'],
    ['not_room_host', '방장만 할 수 있습니다.'],
    ['room_already_closed', '이미 게임 입력이 종료된 경기입니다.'],
    ['not_room_member', '방에 참가한 뒤 게임을 등록할 수 있습니다.'],
    ['host_cannot_leave', '방장은 나갈 수 없습니다. 매칭 리스트에서 내리기를 사용해주세요.'],
    ['room_not_ready', '아직 게임을 추가할 수 없는 경기입니다.'],
    ['cannot_request_self', '자기 자신과의 게임은 등록할 수 없습니다.'],
    ['invalid_opponent', '게임 상대를 다시 선택해주세요.'],
    ['opponent_not_in_room', '상대는 이 방에 참가한 회원이어야 합니다.'],
    ['participant_not_in_room', '참가자는 이 방에 참가한 회원이어야 합니다.'],
    ['doubles_players_required', '복식은 파트너와 상대팀 2번째 선수를 모두 입력해주세요.'],
    ['duplicate_players', '같은 회원을 두 번 지정할 수 없습니다.'],
    ['invalid_partner', '파트너를 다시 선택해주세요.'],
    ['invalid_opponent2', '상대팀 2번째 선수를 다시 선택해주세요.'],
    ['replace_not_allowed', '이미 결과가 있거나 내 기록이 아니어서 대체할 수 없습니다.'],
]

function translate(message: string, fallback: string): string {
    const known = ROOM_ERROR_MESSAGES.find(([key]) => message.includes(key))
    return known ? known[1] : fallback
}

async function requireUser() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return { supabase, user }
}

/**
 * 매칭 만들기(Week 39) — 방을 1급 객체로 만드는 유일한 진입점.
 *
 * create_match_room RPC는 언제나 출처 행을 요구하므로(source_not_found) 방식별 seed를 먼저 만든다.
 * 참가자는 비운 채다 — 사람은 초대 수락(비밀번호 불필요)과 비밀번호 입장으로 채워진다.
 *   · 단식·페어 복식 → 참가자 없는 personal_matches (기존 '모집형' 경로, 0047)
 *   · 로테이션        → 빈 풀 rotation_sessions (입장자가 join_match_room_as_player로 풀에 append된다, 0056)
 *
 * 방 생성이 실패하면 seed를 지운다 — 리스트에도 없고 결과도 없는 빈 껍데기 기록을 남기지 않는다.
 * 반대로 초대만 실패하면 방은 그대로 둔다(룸 안에서 다시 부를 수 있다).
 */
export async function createMatchRoomAction(
    input: CreateMatchRoomInput,
): Promise<{ error: string | null; roomId?: string }> {
    const validationError = validateCreateMatchRoomInput(input)
    if (validationError) return { error: validationError }

    const { supabase, user } = await requireUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const kind = sourceKindOf(input.format)
    const meta = {
        played_at: input.playedAt,
        played_time: input.playedTime,
        match_type: input.matchType,
        surface: input.surface,
        court_name: input.courtName?.trim() || null,
        notes: input.notes?.trim() || null,
    }

    const seed = kind === 'rotation'
        ? await supabase.from('rotation_sessions')
            .insert({ user_id: user.id, players: [], ...meta }).select('id').single()
        : await supabase.from('personal_matches')
            .insert({ user_id: user.id, source_type: 'direct', set_scores: [], ...meta }).select('id').single()
    if (seed.error || !seed.data) return { error: '매칭을 만들지 못했습니다.' }
    const sourceId = seed.data.id

    const room = await listRecordAsRoom(kind, sourceId, input.password)
    if (room.error || !room.roomId) {
        if (kind === 'rotation') await supabase.from('rotation_sessions').delete().eq('id', sourceId)
        else await supabase.from('personal_matches').delete().eq('id', sourceId)
        return { error: '매칭을 만들지 못했습니다. 잠시 후 다시 시도해주세요.' }
    }

    // direct seed는 방을 만들기 위한 발판일 뿐이라 방이 생기면 떼어낸다.
    // 남겨 두면 참가자도 스코어도 없는 행이 방의 대표 게임으로 잡혀 두 가지가 깨진다 —
    // 목록에 만든 적 없는 유령 게임이 뜨고, `recompute_match_room_settled`의 "스코어 빈 게임 0건"이
    // 영영 성립하지 않아 **방이 정산되지 않는다**.
    // ⚠ 삭제 전에 room_id를 먼저 끊는다: cleanup 트리거가 `old.room_id`로 방을 지우기 때문이다(0048 §6).
    // 로테이션 seed(rotation_sessions)는 방의 정체성 자체(미확정 세션)라 그대로 둔다.
    if (kind === 'direct') {
        await supabase.from('personal_matches').update({ room_id: null }).eq('id', sourceId)
        await supabase.from('personal_matches').delete().eq('id', sourceId)
    }

    // 초대 실패는 방을 되돌릴 이유가 못 된다 — 방은 살아 있고 룸 안에서 다시 초대할 수 있다
    let inviteError: string | null = null
    if (input.inviteUserIds.length > 0) {
        const { error } = await supabase.rpc('invite_room_members', {
            p_room_id: room.roomId,
            p_user_ids: input.inviteUserIds,
        })
        if (error) inviteError = '매칭은 만들어졌지만 초대에 실패했습니다. 매칭 룸에서 다시 초대해주세요.'
    }

    revalidateRoomList()
    revalidatePath('/me/personal-matches')
    return { error: inviteError, roomId: room.roomId }
}

/**
 * 비밀번호 입장 — 성공 시 곧바로 참가자(player·joined)가 되고 재입장 때는 비밀번호를 묻지 않는다.
 * 미확정 로테이션 방이면 세션 참가자 풀에도 추가되므로 방장의 결과 입력 카드도 갱신한다.
 */
export async function enterMatchRoomAction(roomId: string, password: string): Promise<ActionResult> {
    const validationError = validateRoomPassword(password)
    if (validationError) return { error: validationError }
    const { supabase, user } = await requireUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const { error } = await supabase.rpc('enter_match_room', { p_room_id: roomId, p_password: password })
    if (error) return { error: translate(error.message, '입장에 실패했습니다.') }
    revalidateRoomPaths(roomId)
    revalidatePath('/me/personal-matches')
    return { error: null }
}

/**
 * 룸 안에서 회원을 추가로 부른다 (0065).
 * 자격은 방장 또는 이미 참가한 회원 — 방에 들어와 있으면 사람을 부를 수 있다(게임 등록과 같은 눈높이).
 * 초대받은 사람은 비밀번호 없이 수락만으로 참가한다.
 */
export async function inviteRoomMembersAction(roomId: string, userIds: string[]): Promise<ActionResult> {
    if (userIds.length === 0) return { error: '초대할 회원을 선택해주세요.' }
    const { supabase, user } = await requireUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const { error } = await supabase.rpc('invite_room_members', { p_room_id: roomId, p_user_ids: userIds })
    if (error) return { error: translate(error.message, '초대에 실패했습니다.') }

    revalidateRoomPaths(roomId)
    revalidatePath('/match-rooms')
    return { error: null }
}

/** 방 초대 수락/거절 (기록에 입력된 회원 — 확인 요청 대표는 요청 수락이 곧 참가라 여기를 거치지 않는다) */
export async function respondRoomInviteAction(roomId: string, accept: boolean): Promise<ActionResult> {
    const { supabase, user } = await requireUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const { error } = await supabase.rpc('respond_room_invite', { p_room_id: roomId, p_accept: accept })
    if (error) return { error: translate(error.message, '초대 응답에 실패했습니다.') }
    revalidateRoomPaths(roomId)
    revalidatePath('/match-rooms')
    return { error: null }
}

/**
 * 방 나가기(0054) — 명단에서 declined로 빠진다. 내가 올린 기록은 그대로 남는다
 * (기록을 방에서 떼는 것은 방장의 '매칭 리스트에서 내리기'가 하는 일이다).
 * 미확정 로테이션 방이면 선수 풀에서도 빠지고, 다시 비밀번호로 입장하면 원래대로 돌아온다.
 */
export async function leaveMatchRoomAction(roomId: string): Promise<ActionResult> {
    const { supabase, user } = await requireUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const { error } = await supabase.rpc('leave_match_room', { p_room_id: roomId })
    if (error) return { error: translate(error.message, '방에서 나가지 못했습니다.') }
    revalidateRoomPaths(roomId)
    revalidatePath('/me/personal-matches')
    revalidatePath('/match-rooms')
    return { error: null }
}

export async function updateRoomPasswordAction(roomId: string, password: string): Promise<ActionResult> {
    const validationError = validateRoomPassword(password)
    if (validationError) return { error: validationError }
    const { supabase, user } = await requireUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const { error } = await supabase.rpc('update_match_room_password', { p_room_id: roomId, p_password: password })
    if (error) return { error: translate(error.message, '비밀번호 변경에 실패했습니다.') }
    // 비밀번호 자체는 렌더되지 않지만, "방 상태를 바꾼 액션은 방 경로를 무효화한다"는 불변식을 지킨다
    revalidateRoomPaths(roomId)
    return { error: null }
}

/**
 * 방 게임 참가자 1명 — 회원(userId)은 방에 참가해 있어야 하고, 비회원은 이름·손잡이·NTRP를 직접 받는다.
 * 복식에서만 쓰인다(단식은 상대 1명).
 */
export type RoomGamePlayerInput = {
    name: string
    userId?: string
    dominantHand?: 'right' | 'left'
    ntrp?: number
}

export type RoomGameInput = {
    roomId: string
    opponentUserId: string   // 상대(단식) 또는 상대팀 대표(복식) — 방 참가자여야 한다
    partner?: RoomGamePlayerInput
    opponent2?: RoomGamePlayerInput
    // 모집 중이던 내 자유 기록을 이 게임으로 치환할 때 그 기록 id ('참가자 채우기')
    replaceMatchId?: string
}

/**
 * 방 게임 등록(0049) — 방에 참가한 회원이 함께 친 게임을 올린다.
 * 방 입장이 곧 참여 동의이므로 상대의 수락 없이 곧바로 양측(복식이면 회원 4명) 기록이 생기고,
 * 결과는 세트 없이 시작해 개인 경기 카드의 제안 → 상대 확인으로 확정된다.
 */
export async function createRoomGameAction(input: RoomGameInput): Promise<ActionResult> {
    const { supabase, user } = await requireUser()
    if (!user) return { error: '로그인이 필요합니다.' }
    if (input.opponentUserId === user.id) return { error: '자기 자신과의 게임은 등록할 수 없습니다.' }

    // 회원 참가자 중복 방지 (나·상대·파트너·상대2) — RPC와 동일 규칙을 먼저 걸러 안내 문구를 낫게 한다
    const memberIds = [user.id, input.opponentUserId, input.partner?.userId, input.opponent2?.userId]
        .filter((id): id is string => !!id)
    if (new Set(memberIds).size !== memberIds.length) return { error: '같은 회원을 두 번 지정할 수 없습니다.' }

    const toJson = (p?: RoomGamePlayerInput) => (p ? {
        user_id: p.userId ?? null,
        name: p.name.trim() || null,
        dominant_hand: p.dominantHand ?? null,
        ntrp: p.ntrp ?? null,
    } : undefined)

    const { error } = await supabase.rpc('create_room_game', {
        p_room_id: input.roomId,
        p_opponent_user_id: input.opponentUserId,
        p_partner: toJson(input.partner),
        p_opponent2: toJson(input.opponent2),
        p_replace_match_id: input.replaceMatchId,
    })
    if (error) return { error: translate(error.message, '게임 등록에 실패했습니다.') }

    revalidateRoomPaths(input.roomId)
    revalidatePath('/me/personal-matches')
    revalidatePath('/match-rooms')
    return { error: null }
}

/**
 * '게임 입력 종료' — 미확정 로테이션 세션을 닫는다(방장 전용, 0050).
 * finalize는 세션을 남겨 두므로(참가자 여러 명이 각자 입력할 수 있어야 한다) 종료는 방장이 명시적으로 한다.
 * 닫으면 방이 정산 대상이 되고, 이후 게임은 '게임 추가'(create_room_game) 경로로 붙는다.
 */
export async function closeRotationRoomAction(roomId: string): Promise<ActionResult> {
    const { supabase, user } = await requireUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const { error } = await supabase.rpc('close_rotation_room', { p_room_id: roomId })
    if (error) return { error: translate(error.message, '게임 입력 종료에 실패했습니다.') }

    revalidateRoomPaths(roomId)
    revalidatePath('/me/personal-matches')
    return { error: null }
}

/** '리스트에서 내리기' — 방만 삭제(RLS: 방장), 출처 기록은 room_id가 null로 풀리며 그대로 남는다 */
export async function deleteMatchRoomAction(roomId: string): Promise<ActionResult> {
    const { supabase, user } = await requireUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const { data, error } = await supabase
        .from('match_rooms')
        .delete()
        .eq('id', roomId)
        .eq('host_user_id', user.id)
        .select('id')
    if (error) return { error: '리스트에서 내리기에 실패했습니다.' }
    if (!data?.length) return { error: '이미 내려갔거나 방장이 아닙니다.' }

    revalidateRoomPaths(roomId)
    revalidatePath('/me/personal-matches')
    return { error: null }
}

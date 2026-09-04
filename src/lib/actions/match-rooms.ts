'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { validateRoomPassword } from '@/lib/match-rooms/password'

/**
 * 경기 리스트(경기 방) 쓰기 — 입장·초대 응답·로테이션 풀 합류·방장 관리.
 * 비밀번호 검증과 멤버 전이는 전부 SECURITY DEFINER RPC(0046) 안에서 하고, 여기서는 사용자 문구로 번역만 한다.
 * 방 생성은 세 등록 액션이 lib/match-rooms/create-room.ts를 통해 한다.
 */

type ActionResult = { error: string | null }

/** RPC가 raise하는 식별자 → 사용자 안내 문구 */
const ROOM_ERROR_MESSAGES: Array<[string, string]> = [
    ['not_authenticated', '로그인이 필요합니다.'],
    ['room_not_found', '존재하지 않거나 리스트에서 내려간 경기입니다.'],
    ['wrong_password', '비밀번호가 일치하지 않습니다.'],
    ['invalid_password', '비밀번호는 4~20자, 공백 없이 입력해주세요.'],
    ['invite_not_found', '처리할 초대가 없습니다.'],
    ['not_rotation_room', '로테이션 경기에서만 합류를 신청할 수 있습니다.'],
    ['room_finalized', '게임이 이미 확정된 경기라 합류할 수 없습니다.'],
    ['not_viewer', '비밀번호로 입장한 뒤 신청할 수 있습니다.'],
    ['already_in_pool', '이미 참가자 풀에 있습니다.'],
    ['not_host', '방장만 할 수 있습니다.'],
    ['request_not_found', '처리할 합류 신청이 없습니다.'],
    ['user_not_found', '신청자를 찾을 수 없습니다.'],
    ['ntrp_missing', '신청자의 NTRP 정보가 없어 승인할 수 없습니다.'],
]

function translate(message: string, fallback: string): string {
    const known = ROOM_ERROR_MESSAGES.find(([key]) => message.includes(key))
    return known ? known[1] : fallback
}

function revalidateRoom(roomId: string) {
    revalidatePath('/match-rooms')
    revalidatePath(`/match-rooms/${roomId}`)
}

async function requireUser() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return { supabase, user }
}

/** 비밀번호 입장 — 성공 시 viewer·joined 멤버로 기록되어 재입장 때는 비밀번호를 묻지 않는다 */
export async function enterMatchRoomAction(roomId: string, password: string): Promise<ActionResult> {
    const validationError = validateRoomPassword(password)
    if (validationError) return { error: validationError }
    const { supabase, user } = await requireUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const { error } = await supabase.rpc('enter_match_room', { p_room_id: roomId, p_password: password })
    if (error) return { error: translate(error.message, '입장에 실패했습니다.') }
    revalidateRoom(roomId)
    return { error: null }
}

/** 방 초대 수락/거절 (기록에 입력된 회원 — 확인 요청 대표는 요청 수락이 곧 참가라 여기를 거치지 않는다) */
export async function respondRoomInviteAction(roomId: string, accept: boolean): Promise<ActionResult> {
    const { supabase, user } = await requireUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const { error } = await supabase.rpc('respond_room_invite', { p_room_id: roomId, p_accept: accept })
    if (error) return { error: translate(error.message, '초대 응답에 실패했습니다.') }
    revalidateRoom(roomId)
    revalidatePath('/me/match-requests')
    return { error: null }
}

/** 로테이션 풀 합류 신청 (비밀번호로 입장한 viewer만) */
export async function requestRoomJoinAction(roomId: string): Promise<ActionResult> {
    const { supabase, user } = await requireUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const { error } = await supabase.rpc('request_room_join', { p_room_id: roomId })
    if (error) return { error: translate(error.message, '합류 신청에 실패했습니다.') }
    revalidateRoom(roomId)
    return { error: null }
}

/** 방장 승인 — rotation_sessions.players에 추가되고 정원 +1 */
export async function approveRoomJoinAction(roomId: string, userId: string): Promise<ActionResult> {
    const { supabase, user } = await requireUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const { error } = await supabase.rpc('approve_room_join', { p_room_id: roomId, p_user_id: userId })
    if (error) return { error: translate(error.message, '합류 승인에 실패했습니다.') }
    revalidateRoom(roomId)
    revalidatePath('/me/personal-matches')
    return { error: null }
}

/** 방장 거절 — 신청자는 열람 멤버로 남는다 */
export async function rejectRoomJoinAction(roomId: string, userId: string): Promise<ActionResult> {
    const { supabase, user } = await requireUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const { error } = await supabase.rpc('reject_room_join', { p_room_id: roomId, p_user_id: userId })
    if (error) return { error: translate(error.message, '합류 거절에 실패했습니다.') }
    revalidateRoom(roomId)
    return { error: null }
}

export async function updateRoomPasswordAction(roomId: string, password: string): Promise<ActionResult> {
    const validationError = validateRoomPassword(password)
    if (validationError) return { error: validationError }
    const { supabase, user } = await requireUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const { error } = await supabase.rpc('update_match_room_password', { p_room_id: roomId, p_password: password })
    if (error) return { error: translate(error.message, '비밀번호 변경에 실패했습니다.') }
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

    revalidateRoom(roomId)
    revalidatePath('/me/personal-matches')
    return { error: null }
}

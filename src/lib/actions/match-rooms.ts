'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { validateRoomPassword } from '@/lib/match-rooms/password'

/**
 * 경기 리스트(경기 방) 쓰기 — 입장·초대 응답·방장 관리.
 * 비밀번호 검증과 멤버 전이는 전부 SECURITY DEFINER RPC(0046·0048) 안에서 하고, 여기서는 사용자 문구로 번역만 한다.
 * 방 생성은 세 등록 액션이 lib/match-rooms/create-room.ts를 통해, 방 게임 추가는 createPersonalMatchesAction(roomId)이 한다.
 */

type ActionResult = { error: string | null }

/** RPC가 raise하는 식별자 → 사용자 안내 문구 */
const ROOM_ERROR_MESSAGES: Array<[string, string]> = [
    ['not_authenticated', '로그인이 필요합니다.'],
    ['room_not_found', '존재하지 않거나 리스트에서 내려간 경기입니다.'],
    ['wrong_password', '비밀번호가 일치하지 않습니다.'],
    ['invalid_password', '비밀번호는 4~20자, 공백 없이 입력해주세요.'],
    ['invite_not_found', '처리할 초대가 없습니다.'],
    ['ntrp_missing', 'NTRP 정보가 없어 참가자 풀에 추가할 수 없습니다.'],
    ['not_host', '방장만 할 수 있습니다.'],
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
    revalidateRoom(roomId)
    revalidatePath('/me/personal-matches')
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

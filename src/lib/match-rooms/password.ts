/**
 * 매칭 룸 비밀번호 규칙 — 4~20자, 공백 금지.
 * 클라(폼 isValid)·액션·RPC(create_match_room / update_match_room_password) 3중 방어의 클라·액션 몫.
 */
export const ROOM_PASSWORD_MIN = 4
export const ROOM_PASSWORD_MAX = 20

/** 등록 폼 '리스트에 노출' 옵션 페이로드 — 켜면 비밀번호 필수 (폼 훅·등록 액션 공용, 순수 타입) */
export type RoomListingInput = { password: string }

export function validateRoomPassword(password: string): string | null {
    if (password.length < ROOM_PASSWORD_MIN || password.length > ROOM_PASSWORD_MAX) {
        return `비밀번호는 ${ROOM_PASSWORD_MIN}~${ROOM_PASSWORD_MAX}자로 입력해주세요.`
    }
    if (/\s/.test(password)) return '비밀번호에는 공백을 넣을 수 없습니다.'
    return null
}

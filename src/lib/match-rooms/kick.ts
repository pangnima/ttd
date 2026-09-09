import type { MemberRowView } from '@/lib/match-rooms/members-view'

/**
 * 방장의 강퇴 자격 (순수 — DB 가드 kick_room_member(0068)의 거울).
 *
 * 강퇴는 '차단'이다: 비밀번호를 알아도 재입장할 수 없고 방장의 재초대로만 풀린다.
 * 내보낸 사람은 명단에서 사라지므로(members-view) 되돌리는 길은 [회원 초대] 검색이다 —
 * 거기서 방장에게만 강퇴자가 후보로 남는다(inviteExcludedUserIds).
 *
 * 정산이 끝난 방에서는 막는다. 명단을 바꿔도 결과가 달라지지 않는데
 * 행 옆에 버튼만 남으면 "무엇이 달라지나"를 사용자가 물을 수밖에 없다.
 */

export type KickTargetRow = Pick<MemberRowView, 'userId' | 'statusLabel'>

type KickArgs = {
    isHost: boolean
    viewerId: string
    isSettled: boolean
    row: KickTargetRow
}

/** [내보내기] — 방장이, 아직 방에 있는 다른 회원에게만 */
export function canKickRoomMember({ isHost, viewerId, isSettled, row }: KickArgs): boolean {
    if (!isHost || isSettled) return false
    // 비회원 행은 users 행이 없어 멤버 테이블에 존재하지 않는다
    if (!row.userId || row.userId === viewerId) return false
    return row.statusLabel === '참가' || row.statusLabel === '초대 대기'
}

/**
 * [빼기] — 방에 등록된 비회원(0069)을 명단에서 제거할 수 있는가.
 * DB 가드 remove_room_guest의 거울: 방장 ∨ 등록한 본인, 정산된 방이면 불가.
 * 이미 저장된 게임은 지워지지 않는다 — 그 게임이 남아 있는 한 파생 '비회원' 행으로 계속 보인다.
 */
export function canRemoveRoomGuest(
    { isHost, isSettled, viewerId, row }: { isHost: boolean; isSettled: boolean; viewerId: string; row: Pick<MemberRowView, 'guestId' | 'guestCreatedBy'> },
): boolean {
    if (isSettled || !row.guestId) return false
    return isHost || row.guestCreatedBy === viewerId
}

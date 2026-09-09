import type { MemberRowView } from '@/lib/match-rooms/members-view'

/**
 * 방장의 강퇴·재초대 자격 (순수 — DB 가드 kick_room_member(0068)의 거울).
 *
 * 강퇴는 '차단'이다: 비밀번호를 알아도 재입장할 수 없고 방장의 재초대로만 풀린다.
 * 그래서 되돌릴 경로(재초대)를 같은 화면에 함께 둔다 — 없으면 오조작이 복구 불가가 된다.
 *
 * 정산이 끝난 방에서는 둘 다 막는다. 명단을 바꿔도 결과가 달라지지 않는데
 * 행 옆에 버튼만 남으면 "무엇이 달라지나"를 사용자가 물을 수밖에 없다.
 */

export type KickTargetRow = Pick<MemberRowView, 'userId' | 'statusLabel'>

/** 명단의 '강퇴됨' 라벨 — members-view가 removed 상태에 붙이는 값 */
export const KICKED_LABEL = '강퇴됨'

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

/** [다시 초대] — 강퇴한 사람을 되돌리는 유일한 경로. 방장만 할 수 있다 */
export function canReinviteRoomMember({ isHost, isSettled, row }: Omit<KickArgs, 'viewerId'>): boolean {
    if (!isHost || isSettled) return false
    return !!row.userId && row.statusLabel === KICKED_LABEL
}

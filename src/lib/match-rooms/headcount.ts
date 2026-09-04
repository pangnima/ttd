import type { MatchRoomMember, MatchRoomMemberRole, MatchRoomMemberStatus } from '@/types'

type MemberLike = Pick<MatchRoomMember, 'role' | 'status'>
type ViewerLike = { role: MatchRoomMemberRole; status: MatchRoomMemberStatus }

/** 참가 인원 — 방장 + joined된 참가자. 초대 대기·거절은 제외. (정원 개념은 없다 — 0048) */
export function countJoined(members: MemberLike[]): number {
    return members.filter((m) => m.status === 'joined').length
}

/** 실제 참여 — '참가 인원'에 잡히는 상태(방장 포함). 게임 등록 자격 판정에 쓴다. */
export function isViewerJoined(viewer?: ViewerLike): boolean {
    return !!viewer && viewer.status === 'joined'
}

/**
 * '내가 참여한 경기' 탭 술어 — 초대 대기(invited)도 내 경기로 본다.
 * 초대는 방장이 기록에 내 이름을 넣은 상태라 이미 내 경기이고, 목록 카드가 '초대됨' 칩으로 구분해 준다.
 * 거절(declined)만 제외한다.
 */
export function isViewerInvolved(viewer?: ViewerLike): boolean {
    return !!viewer && viewer.status !== 'declined'
}

/** "참가 3명" 표기 */
export function formatHeadcount(joined: number): string {
    return `참가 ${joined}명`
}

/** 목록 카드 상태 칩 라벨 — 없으면 아직 입장하지 않은 방 */
export function viewerStatusLabel(viewer?: ViewerLike): string | null {
    if (!viewer) return null
    if (viewer.role === 'host') return '방장'
    if (viewer.status === 'invited') return '초대됨'
    if (viewer.status === 'declined') return null
    return '참가'
}

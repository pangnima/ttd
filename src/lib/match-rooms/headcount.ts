import type { MatchRoomMember, MatchRoomMemberRole, MatchRoomMemberStatus } from '@/types'

type MemberLike = Pick<MatchRoomMember, 'role' | 'status'>
type ViewerLike = { role: MatchRoomMemberRole; status: MatchRoomMemberStatus }

/** 참가 인원 — 방장 + joined된 참가자. 초대 대기·거절은 제외. (정원 개념은 없다 — 0048) */
export function countJoined(members: MemberLike[]): number {
    return members.filter((m) => m.status === 'joined').length
}

/**
 * 실제 참여 — '참가 인원'에 잡히는 상태(방장 행도 joined다).
 * 게임 등록 자격과 **'내가 참여한 경기' 탭**(fetchMyRoomIds)이 함께 보는 단일 술어다.
 *
 * ⚠ 초대 대기(invited)는 참여가 아니다(Week 39). 종전에는 "초대도 내 경기"라며 세었지만,
 * 초대가 목록 최상단 「나를 초대한 매칭」으로 올라오면서 같은 방이 두 자리에 나오고
 * 수락도 하지 않았는데 탭 숫자가 오르는 문제가 됐다. 수락하는 순간 이 술어가 참이 된다.
 */
export function isViewerJoined(viewer?: ViewerLike): boolean {
    return !!viewer && viewer.status === 'joined'
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

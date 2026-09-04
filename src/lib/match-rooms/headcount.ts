import type { MatchRoomMember, MatchRoomMemberRole, MatchRoomMemberStatus } from '@/types'

type MemberLike = Pick<MatchRoomMember, 'role' | 'status'>

/** 참가 인원 — 방장 + joined된 참가자. 초대 대기·거절은 제외. (정원 개념은 없다 — 0048) */
export function countJoined(members: MemberLike[]): number {
    return members.filter((m) => m.status === 'joined').length
}

/** "참가 3명" 표기 */
export function formatHeadcount(joined: number): string {
    return `참가 ${joined}명`
}

/** 목록 카드 상태 칩 라벨 — 없으면 아직 입장하지 않은 방 */
export function viewerStatusLabel(viewer?: { role: MatchRoomMemberRole; status: MatchRoomMemberStatus }): string | null {
    if (!viewer) return null
    if (viewer.role === 'host') return '방장'
    if (viewer.status === 'invited') return '초대됨'
    if (viewer.status === 'declined') return null
    return '참가'
}

import type { MatchRoomMember, MatchRoomMemberRole, MatchRoomMemberStatus } from '@/types'

type MemberLike = Pick<MatchRoomMember, 'role' | 'status'>

/** 인원 집계 — 방장 + 참가자(player)로 joined된 사람. 열람만 하는 viewer는 제외. */
export function countJoined(members: MemberLike[]): number {
    return members.filter((m) => m.status === 'joined' && m.role !== 'viewer').length
}

/** "3/4" 표기 (정원 = match_rooms.capacity) */
export function formatHeadcount(joined: number, capacity: number): string {
    return `${joined}/${capacity}`
}

/** 목록 카드 상태 칩 라벨 — 없으면 아직 입장하지 않은 방 */
export function viewerStatusLabel(viewer?: { role: MatchRoomMemberRole; status: MatchRoomMemberStatus }): string | null {
    if (!viewer) return null
    if (viewer.role === 'host') return '방장'
    if (viewer.status === 'invited') return '초대됨'
    if (viewer.status === 'requested') return '합류 승인 대기'
    if (viewer.status === 'declined') return null
    return viewer.role === 'player' ? '참가' : '입장함'
}

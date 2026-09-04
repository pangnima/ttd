import type { MatchRoomDetail, MatchRoomMember } from '@/types'

/**
 * 방 상세 참가자 명단 행 — 멤버 테이블(회원) + 출처 기록의 비회원 참가자 + 수락 전 대표 확인자를 한 목록으로 합친다.
 * 순수 함수(테스트 대상). 표시 순서: 방장 → 참가 → 초대 대기 → 합류 신청 → 열람 → 비회원/확인 대기.
 */
export type MemberRowView = {
    key: string
    name: string
    nickname?: string
    profileImage?: string
    userId?: string
    deleted?: boolean
    statusLabel: string
    // 방장이 승인/거절할 수 있는 합류 신청 행
    joinRequest?: boolean
}

const ORDER: Record<string, number> = {
    '방장': 0, '참가': 1, '초대 대기': 2, '합류 신청': 3, '열람': 4, '확인 대기': 5, '비회원': 6,
}

function memberStatusLabel(m: MatchRoomMember): string | null {
    if (m.role === 'host') return '방장'
    if (m.status === 'declined') return null
    if (m.status === 'invited') return '초대 대기'
    if (m.status === 'requested') return '합류 신청'
    return m.role === 'player' ? '참가' : '열람'
}

function memberRow(m: MatchRoomMember): MemberRowView | null {
    const statusLabel = memberStatusLabel(m)
    if (!statusLabel) return null
    return {
        key: `m:${m.userId}`,
        name: m.name,
        nickname: m.nickname || undefined,
        profileImage: m.profileImage,
        userId: m.userId,
        deleted: m.deleted,
        statusLabel,
        joinRequest: m.status === 'requested',
    }
}

/** 출처 기록에서 비회원(회원 id 없음) 참가자 이름을 뽑는다 — 멤버 테이블에 없으므로 이름만 표시 */
function guestRows(detail: MatchRoomDetail): MemberRowView[] {
    const rows: MemberRowView[] = []
    const seen = new Set<string>()
    const push = (name: string, statusLabel = '비회원') => {
        const trimmed = name.trim()
        if (!trimmed || seen.has(trimmed)) return
        seen.add(trimmed)
        rows.push({ key: `g:${trimmed}`, name: trimmed, statusLabel })
    }
    const s = detail.source
    if (s.kind === 'confirmation') {
        if (s.requestStatus === 'pending' && s.repName) push(s.repName, '확인 대기')
        for (const p of s.participants) if (!p.userId) push(p.name)
    } else if (s.kind === 'rotation' && s.pool) {
        for (const p of s.pool) if (!p.userId) push(p.name)
    }
    // 게임 행(자유 기록·수락 후 확인 경기·finalize된 로테이션)의 비회원 참가자
    for (const g of detail.games) for (const p of g.participants) if (!p.userId) push(p.name)
    return rows
}

export function buildMemberRows(detail: MatchRoomDetail): MemberRowView[] {
    const members = detail.members.map(memberRow).filter((r): r is MemberRowView => !!r)
    const memberIds = new Set(members.map((r) => r.userId))
    // 수락 전 대표가 이미 멤버(예: 비밀번호로 먼저 입장)면 중복 표시하지 않는다
    const guests = guestRows(detail).filter((g) => !(detail.source.kind === 'confirmation' && g.statusLabel === '확인 대기' && detail.source.repUserId && memberIds.has(detail.source.repUserId)))
    return [...members, ...guests].sort((a, b) => (ORDER[a.statusLabel] ?? 9) - (ORDER[b.statusLabel] ?? 9))
}

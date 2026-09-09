import type { MatchRoomDetail, MatchRoomMember } from '@/types'
import { formatDominantHand, formatRacket } from '@/lib/profile/signup-fields'

/**
 * 방 상세 참가자 명단 행 — 멤버 테이블(회원) + 출처 기록의 비회원 참가자 + 수락 전 대표 확인자를 한 목록으로 합친다.
 * 순수 함수(테스트 대상). 표시 순서: 방장 → 참가 → 초대 대기 → 비회원/확인 대기.
 * (열람·합류 신청 상태는 0048에서 폐지 — 비밀번호 입장이 곧 참가)
 */
export type MemberRowView = {
    key: string
    name: string
    nickname?: string
    profileImage?: string
    userId?: string
    deleted?: boolean
    statusLabel: string
    /** 프로필 메타(0067) — 회원 행에만 있다. 비회원은 users 행이 없어 전부 undefined */
    ntrp?: number
    hand?: 'right' | 'left'
    racketBrand?: string
    racketModel?: string
}

/**
 * 행 2줄째에 붙는 부가 정보 한 줄 — 닉네임 · 주력손 · 라켓.
 *
 * 비어 있는 항목은 통째로 빠진다. 특히 라켓은 formatRacket이 '미입력'을 반환하지만
 * 여기서는 그 경우 항목 자체를 넣지 않는다 — 명단에 '미입력'이 다섯 줄 늘어서면 소음이다.
 * NTRP는 이 줄에 넣지 않는다(배지로 따로 그려 어떤 폭에서도 잘리지 않게 한다).
 */
export function memberMetaLine(row: MemberRowView): string {
    const racket = formatRacket(row.racketBrand, row.racketModel)
    return [row.nickname, formatDominantHand(row.hand), racket === '미입력' ? undefined : racket]
        .filter(Boolean)
        .join(' · ')
}

const ORDER: Record<string, number> = {
    '방장': 0, '참가': 1, '초대 대기': 2, '확인 대기': 3, '비회원': 4,
}

function memberStatusLabel(m: MatchRoomMember): string | null {
    if (m.role === 'host') return '방장'
    if (m.status === 'declined') return null
    if (m.status === 'invited') return '초대 대기'
    return '참가'
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
        ntrp: m.ntrp,
        hand: m.hand,
        racketBrand: m.racketBrand,
        racketModel: m.racketModel,
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

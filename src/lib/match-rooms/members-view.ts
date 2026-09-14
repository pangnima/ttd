import type { MatchRoomDetail, MatchRoomGuest, MatchRoomMember } from '@/types'
import { formatDominantHand, formatRacket } from '@/lib/profile/signup-fields'
import {
    GUEST_LABEL, HOST_LABEL, INVITED_LABEL, JOINED_LABEL, PENDING_CONFIRM_LABEL,
} from '@/lib/match-rooms/member-labels'

/**
 * 방 상세 참가자 명단 행 — 멤버 테이블(회원) + 출처 기록의 비회원 참가자 + 수락 전 대표 확인자를 한 목록으로 합친다.
 * 순수 함수(테스트 대상). 표시 순서: 호스트 → 참가 → 초대 대기 → 비회원/확인 대기.
 *
 * **지금 방에 있는 사람만 뜬다** — 스스로 나간 사람(declined)도, 호스트가 내보낸 사람(removed)도 없다.
 * 강퇴 행을 남겨 [다시 초대]를 붙이던 방식(0068)은 철회했다: 명단은 "코트에 누가 있나"를 읽는 곳이고,
 * 되돌릴 길은 [회원 초대] 검색이 대신한다(inviteExcludedUserIds가 호스트에게만 강퇴자를 후보로 남긴다).
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
    /** 방에 등록된 비회원(0069)의 행 id — [빼기]의 대상. 파생 비회원 행에는 없다 */
    guestId?: string
    /** 등록한 회원 — 호스트가 아니어도 본인이 부른 게스트는 뺄 수 있다 */
    guestCreatedBy?: string
    /** 프로필 메타(0067) — 회원 행에만 있다. 파생 비회원은 users 행이 없어 전부 undefined */
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

// 라벨 문자열이 곧 키다 — member-labels의 상수를 계산 키로 써서 라벨과 키가 갈릴 자리를 없앤다
const ORDER: Record<string, number> = {
    [HOST_LABEL]: 0, [JOINED_LABEL]: 1, [INVITED_LABEL]: 2, [PENDING_CONFIRM_LABEL]: 3, [GUEST_LABEL]: 4,
}

function memberStatusLabel(m: MatchRoomMember): string | null {
    if (m.role === 'host') return HOST_LABEL
    // 나간 사람도 내보낸 사람도 명단에서 빠진다 — 남는 것은 지금 방에 있거나 올 사람뿐이다
    if (m.status === 'declined' || m.status === 'removed') return null
    if (m.status === 'invited') return INVITED_LABEL
    return JOINED_LABEL
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

/**
 * 방에 등록된 비회원(0069) — 게임에 이름이 오르기 전부터 명단에 있다.
 * 파생 비회원 행보다 먼저 놓아, 같은 사람이 게임에도 나오면 이름 dedupe가 그쪽을 흡수하게 한다.
 */
function roomGuestRows(guests: MatchRoomGuest[], seen: Set<string>): MemberRowView[] {
    const rows: MemberRowView[] = []
    for (const g of guests) {
        const name = g.name.trim()
        if (!name || seen.has(name)) continue
        seen.add(name)
        rows.push({
            key: `rg:${g.id}`,
            name,
            statusLabel: GUEST_LABEL,
            guestId: g.id,
            guestCreatedBy: g.createdBy,
            ntrp: g.ntrp,
            hand: g.hand,
        })
    }
    return rows
}

/** 출처 기록·게임에서 파생된 비회원 — 등록 절차 없이 이름만 남은 사람들 */
function guestRows(detail: MatchRoomDetail, seen: Set<string>): MemberRowView[] {
    const rows: MemberRowView[] = []
    const push = (name: string, statusLabel: string = GUEST_LABEL) => {
        const trimmed = name.trim()
        if (!trimmed || seen.has(trimmed)) return
        seen.add(trimmed)
        rows.push({ key: `g:${trimmed}`, name: trimmed, statusLabel })
    }
    const s = detail.source
    if (s.kind === 'confirmation') {
        if (s.requestStatus === 'pending' && s.repName) push(s.repName, PENDING_CONFIRM_LABEL)
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
    // 이름 집합은 등록 게스트 → 파생 비회원 순으로 이어진다(한 사람이 두 행이 되지 않는다)
    const seen = new Set<string>()
    const roomGuests = roomGuestRows(detail.guests, seen)
    // 수락 전 대표가 이미 멤버(예: 비밀번호로 먼저 입장)면 중복 표시하지 않는다
    const guests = guestRows(detail, seen).filter((g) => !(detail.source.kind === 'confirmation' && g.statusLabel === PENDING_CONFIRM_LABEL && detail.source.repUserId && memberIds.has(detail.source.repUserId)))
    return [...members, ...roomGuests, ...guests].sort((a, b) => (ORDER[a.statusLabel] ?? 9) - (ORDER[b.statusLabel] ?? 9))
}

/**
 * [회원 초대] 검색에서 뺄 회원 id — 이미 방에 있거나 부를 수 없는 사람.
 *
 * 강퇴자(removed)만 예외다. `invite_room_members`(0068 §5)는 **호스트가 부를 때만** 강퇴를 풀어 주므로,
 * 명단에서 사라진 그 사람을 다시 부르는 길이 호스트에게는 여기밖에 없다.
 * 참가자에게 보이면 눌러도 아무 일이 없는 헛 항목이 되므로 그때는 함께 제외한다.
 * 나간 사람(declined)은 어느 쪽도 되살릴 수 없다 — RPC가 `on conflict do nothing`이라 언제나 제외한다.
 */
export function inviteExcludedUserIds(members: MatchRoomMember[], canReinvite: boolean): string[] {
    return members
        .filter((m) => !(m.status === 'removed' && canReinvite))
        .map((m) => m.userId)
}

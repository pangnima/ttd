import type { OpponentCandidate } from '@/lib/queries/users'
import type { PastOpponent } from '@/lib/queries/personal-matches'
import { derivePublicNtrp } from './ntrp'

/**
 * 상대 자동완성 후보 (순수 모듈 — DB 접근 없음).
 * 입력창에 타이핑한 이름으로 [방 참가자 / 만나본 사람 / 클럽 회원 / 전체 회원] 그룹을 만든다.
 * 방 참가자(0048)는 매칭 리스트 방에 들어온 회원 — 방장이 방 게임을 구성할 때 최상단에 뜬다.
 * 항목을 고르면 userId·손잡이·NTRP가 폼에 자동 채워지고, 고르지 않으면 입력한 이름 그대로 게스트로 저장된다.
 */

export type PlayerSuggestionSource = 'room' | 'past' | 'club' | 'search'

export type PlayerSuggestion = {
    // base-ui Autocomplete { value, label } 규약 — label이 입력창에 채워진다
    value: string   // 'room:userId' | 'past:이름' | 'club:userId' | 'search:userId'
    label: string   // 표시·입력 이름
    source: PlayerSuggestionSource
    userId?: string
    hand?: 'right' | 'left'
    ntrp?: number   // 회원: derivePublicNtrp(프로필 파생) / 만나본 사람: 마지막 입력 NTRP
    isGuest: boolean
    meta?: string   // 클럽명(클럽 회원) / 닉네임(방 참가자·전체 회원)
}

export type PlayerSuggestionGroup = {
    value: string   // 그룹 라벨 (base-ui Group 규약)
    items: PlayerSuggestion[]
}

export type PlayerSuggestionSources = {
    pastOpponents: PastOpponent[]
    candidates: OpponentCandidate[]
    // 플랫폼 전체 회원 서버 검색 결과 (단식 상대에서만 전달)
    searchResults?: OpponentCandidate[]
    // 매칭 리스트 방의 참가자 (방 게임 구성·모집형 채우기에서만 전달)
    roomParticipants?: OpponentCandidate[]
}

export const SUGGESTION_GROUP_LABELS: Record<PlayerSuggestionSource, string> = {
    room: '방 참가자',
    past: '만나본 사람',
    club: '클럽 회원',
    search: '전체 회원',
}

function matchesQuery(query: string, ...fields: (string | undefined)[]): boolean {
    if (!query) return true
    return fields.some((f) => !!f && f.toLowerCase().includes(query))
}

function fromCandidate(c: OpponentCandidate, source: 'room' | 'club' | 'search'): PlayerSuggestion {
    return {
        value: `${source}:${c.id}`,
        label: c.name,
        source,
        userId: c.id,
        hand: c.dominantHand,
        // 회원 NTRP는 서버가 프로필에서 파생하는 값 — 같은 규칙(derive_public_ntrp)으로 프리필해 화면과 저장값을 맞춘다
        ntrp: derivePublicNtrp(c),
        isGuest: c.isGuest,
        meta: source === 'club' ? c.clubNames[0] : c.nickname,
    }
}

/** 이름 비교용 정규화 — 공백·대소문자 차이는 같은 사람으로 본다 */
function normalizeName(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, '')
}

/**
 * 후보 그룹 생성. 빈 항목 그룹은 제외한다.
 * - 방 참가자: 클라이언트 필터, 빈 입력이면 전체 노출. 같은 회원은 클럽·전체 회원 그룹에서 제외(방 그룹 우선).
 * - 만나본 사람·클럽 회원: 입력값으로 클라이언트 필터(이름·닉네임 부분 일치). 빈 입력이면 전체 노출.
 * - 전체 회원: 서버 검색 결과에서 클럽 후보와 겹치는 회원을 제외(클럽 그룹 우선)하고 입력값으로 재필터. 빈 입력이면 숨김.
 *
 * ⚠ '만나본 사람'은 회원과 **이름이 겹치면 버린다**(Week 39). 그 그룹은 목록 위쪽에 있고 userId가 없어서,
 * 예전에 게스트로 적어 둔 이름이 회원 항목보다 먼저 보이면 회원을 게스트로 기록하게 된다 —
 * 회원이 끼는 경기는 매칭 룸을 거쳐야 하므로(direct-record.ts) 그 오선택이 곧 동의 절차 우회로가 된다.
 */
export function buildPlayerSuggestionGroups(
    rawQuery: string,
    { pastOpponents, candidates, searchResults = [], roomParticipants = [] }: PlayerSuggestionSources,
): PlayerSuggestionGroup[] {
    const query = rawQuery.trim().toLowerCase()

    const room = roomParticipants
        .filter((c) => matchesQuery(query, c.name, c.nickname))
        .map((c) => fromCandidate(c, 'room'))
    const roomIds = new Set(roomParticipants.map((c) => c.id))

    // 회원(비게스트) 이름 — 방 참가자·클럽 후보·검색 결과 전부에서 모은다
    const memberNames = new Set(
        [...roomParticipants, ...candidates, ...searchResults]
            .filter((c) => !c.isGuest)
            .map((c) => normalizeName(c.name)),
    )

    const past: PlayerSuggestion[] = pastOpponents
        .filter((p) => !memberNames.has(normalizeName(p.name)) && matchesQuery(query, p.name))
        .map((p) => ({
            value: `past:${p.name}`,
            label: p.name,
            source: 'past',
            hand: p.hand,
            ntrp: p.ntrp,
            isGuest: true,
        }))

    const club = candidates
        .filter((c) => !roomIds.has(c.id) && matchesQuery(query, c.name, c.nickname))
        .map((c) => fromCandidate(c, 'club'))

    // 서버 결과는 디바운스 때문에 직전 검색어 기준일 수 있어 현재 입력값으로 한 번 더 거른다
    const clubIds = new Set(candidates.map((c) => c.id))
    const search = query
        ? searchResults
            .filter((c) => !roomIds.has(c.id) && !clubIds.has(c.id) && matchesQuery(query, c.name, c.nickname))
            .map((c) => fromCandidate(c, 'search'))
        : []

    const groups: PlayerSuggestionGroup[] = [
        { value: SUGGESTION_GROUP_LABELS.room, items: room },
        { value: SUGGESTION_GROUP_LABELS.past, items: past },
        { value: SUGGESTION_GROUP_LABELS.club, items: club },
        { value: SUGGESTION_GROUP_LABELS.search, items: search },
    ]
    return groups.filter((g) => g.items.length > 0)
}

import type { OpponentCandidate } from '@/lib/queries/users'
import type { PastOpponent } from '@/lib/queries/personal-matches'

/**
 * 상대 자동완성 후보 (순수 모듈 — DB 접근 없음).
 * 입력창에 타이핑한 이름으로 [만나본 사람 / 클럽 회원 / 전체 회원] 세 그룹을 만든다.
 * 항목을 고르면 userId·손잡이·NTRP가 폼에 자동 채워지고, 고르지 않으면 입력한 이름 그대로 게스트로 저장된다.
 */

export type PlayerSuggestionSource = 'past' | 'club' | 'search'

export type PlayerSuggestion = {
    // base-ui Autocomplete { value, label } 규약 — label이 입력창에 채워진다
    value: string   // 'past:이름' | 'club:userId' | 'search:userId'
    label: string   // 표시·입력 이름
    source: PlayerSuggestionSource
    userId?: string
    hand?: 'right' | 'left'
    ntrp?: number   // 회원: personalNtrp ?? ntrp / 만나본 사람: 마지막 입력 NTRP
    isGuest: boolean
    meta?: string   // 클럽명(클럽 회원) / 닉네임(전체 회원)
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
}

export const SUGGESTION_GROUP_LABELS: Record<PlayerSuggestionSource, string> = {
    past: '만나본 사람',
    club: '클럽 회원',
    search: '전체 회원',
}

function matchesQuery(query: string, ...fields: (string | undefined)[]): boolean {
    if (!query) return true
    return fields.some((f) => !!f && f.toLowerCase().includes(query))
}

function fromCandidate(c: OpponentCandidate, source: 'club' | 'search'): PlayerSuggestion {
    return {
        value: `${source}:${c.id}`,
        label: c.name,
        source,
        userId: c.id,
        hand: c.dominantHand,
        ntrp: c.personalNtrp ?? c.ntrp,
        isGuest: c.isGuest,
        meta: source === 'club' ? c.clubNames[0] : c.nickname,
    }
}

/**
 * 후보 그룹 생성. 빈 항목 그룹은 제외한다.
 * - 만나본 사람·클럽 회원: 입력값으로 클라이언트 필터(이름·닉네임 부분 일치). 빈 입력이면 전체 노출.
 * - 전체 회원: 서버 검색 결과에서 클럽 후보와 겹치는 회원을 제외(클럽 그룹 우선)하고 입력값으로 재필터. 빈 입력이면 숨김.
 */
export function buildPlayerSuggestionGroups(
    rawQuery: string,
    { pastOpponents, candidates, searchResults = [] }: PlayerSuggestionSources,
): PlayerSuggestionGroup[] {
    const query = rawQuery.trim().toLowerCase()

    const past: PlayerSuggestion[] = pastOpponents
        .filter((p) => matchesQuery(query, p.name))
        .map((p) => ({
            value: `past:${p.name}`,
            label: p.name,
            source: 'past',
            hand: p.hand,
            ntrp: p.ntrp,
            isGuest: true,
        }))

    const club = candidates
        .filter((c) => matchesQuery(query, c.name, c.nickname))
        .map((c) => fromCandidate(c, 'club'))

    // 서버 결과는 디바운스 때문에 직전 검색어 기준일 수 있어 현재 입력값으로 한 번 더 거른다
    const clubIds = new Set(candidates.map((c) => c.id))
    const search = query
        ? searchResults
            .filter((c) => !clubIds.has(c.id) && matchesQuery(query, c.name, c.nickname))
            .map((c) => fromCandidate(c, 'search'))
        : []

    const groups: PlayerSuggestionGroup[] = [
        { value: SUGGESTION_GROUP_LABELS.past, items: past },
        { value: SUGGESTION_GROUP_LABELS.club, items: club },
        { value: SUGGESTION_GROUP_LABELS.search, items: search },
    ]
    return groups.filter((g) => g.items.length > 0)
}

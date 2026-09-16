import type { OpponentCandidate } from '@/lib/queries/users'

/**
 * 회원 검색 규칙 (순수 모듈 — DB 접근 없음).
 *
 * 검색이 닿는 자리는 둘이다 — 회원을 **고르는** 자리(매칭 만들기 상대 초대·룸 [회원 초대], [검색] 버튼/Enter로
 * 명시 조회)와 이름을 **적는** 자리(게임 추가 폼의 선수 입력, 타이핑 자동완성). 두 자리가 같은 조회 함수를
 * 쓰므로 패턴·정렬·상한 규칙은 여기 한 곳에 둔다.
 */

/** 1자부터 — 한글 이름은 성 한 글자로도 충분히 좁혀진다. 옛 2자 하한은 「입력해도 안 나온다」로 읽혔다 */
export const MIN_USER_SEARCH_LENGTH = 1
/** 화면에 보이는 최대 인원. 조회는 +1건을 받아 「더 있다」를 판정한다(splitOverflow) */
export const USER_SEARCH_LIMIT = 20

/** trim + 연속 공백 축약 — 「김  민수」와 「김 민수」는 같은 검색어다 */
export function normalizeUserSearchQuery(raw: string): string {
    return raw.trim().replace(/\s+/g, ' ')
}

/**
 * ilike 패턴. PostgREST `or()` 구문과 충돌하는 `,()`는 제거하고, LIKE 와일드카드 `%`·`_`는 이스케이프한다 —
 * `_`는 한 글자 와일드카드라 `kim_a`가 `kimba`에도 걸린다(옛 코드가 놓치던 자리).
 * 남는 글자가 없으면 null(조회하지 않는다).
 */
export function buildUserSearchPattern(query: string): string | null {
    const cleaned = normalizeUserSearchQuery(query)
        .replace(/[,()]/g, '')
        .replace(/[%_\\]/g, (ch) => `\\${ch}`)
    return cleaned ? `%${cleaned}%` : null
}

function startsWith(field: string | undefined, query: string): boolean {
    return !!field && field.toLowerCase().startsWith(query)
}

/** 이름·닉네임이 검색어로 **시작하는** 사람을 앞에, 그 안에서는 이름순 — 「김」을 치면 김씨가 먼저 온다 */
export function rankUserSearchResults(rows: OpponentCandidate[], query: string): OpponentCandidate[] {
    const q = normalizeUserSearchQuery(query).toLowerCase()
    return [...rows].sort((a, b) => {
        const pa = startsWith(a.name, q) || startsWith(a.nickname, q) ? 0 : 1
        const pb = startsWith(b.name, q) || startsWith(b.nickname, q) ? 0 : 1
        return pa - pb || a.name.localeCompare(b.name, 'ko')
    })
}

/** limit + 1건을 받아 왔을 때 화면 몫과 「더 있다」로 가른다 */
export function splitOverflow<T>(rows: T[], limit: number): { items: T[]; hasMore: boolean } {
    return { items: rows.slice(0, limit), hasMore: rows.length > limit }
}

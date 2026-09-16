import type { ReactNode } from 'react'
import type { OpponentCandidate } from '@/lib/queries/users'
import type { MemberLookupStatus } from '@/components/common/member-search/use-member-lookup'
import { USER_SEARCH_LIMIT } from '@/lib/profile/user-search'
import { CARD_BASE, TYPO } from '@/lib/dashboard/tokens'

type Props = {
    status: MemberLookupStatus
    query: string
    results: OpponentCandidate[]
    hasMore: boolean
    error: string | null
    renderRow: (candidate: OpponentCandidate) => ReactNode
    /** 아직 한 번도 검색하지 않았을 때 */
    idleText?: string
}

const NOTE = `${TYPO.caption} break-keep`

/**
 * 회원 검색 결과 영역 — 팝업이 아니라 입력창 아래에 **인라인**으로 놓인다.
 * 지금 무슨 상태인지(아직 안 찾음 / 검색 중 / 없음 / N명 / 더 있음)를 매번 말한다 —
 * 옛 자동완성은 대기 중에도 「없습니다」라 단정해서 검색이 고장 난 것처럼 보였다.
 */
export function MemberSearchResults({ status, query, results, hasMore, error, renderRow, idleText }: Props) {
    if (status === 'idle') return <p className={NOTE}>{idleText ?? '이름이나 닉네임을 입력하고 검색하세요.'}</p>
    if (status === 'loading') return <p className={NOTE} role="status">검색 중…</p>
    if (status === 'error') return <p className="text-caption text-destructive break-keep" role="alert">{error}</p>
    if (results.length === 0) return <p className={NOTE}>&lsquo;{query}&rsquo;와 일치하는 회원이 없습니다.</p>

    return (
        <div className="space-y-1.5">
            <ul className={`${CARD_BASE} divide-y divide-border max-h-64 overflow-y-auto`} aria-label="검색 결과">
                {results.map(renderRow)}
            </ul>
            {hasMore && (
                <p className={NOTE}>{USER_SEARCH_LIMIT}명까지만 보입니다. 이름을 더 정확히 입력해 주세요.</p>
            )}
        </div>
    )
}

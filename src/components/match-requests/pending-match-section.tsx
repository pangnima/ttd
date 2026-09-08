import { Children, type ReactNode } from 'react'
import type { PendingMatchEntry } from '@/lib/queries/match-queue'
import type { MatchQueueBucket } from '@/lib/match-requests/queue'
import { buildMatchGroups } from '@/lib/personal-matches/match-groups'
import { CARD_BASE } from '@/lib/dashboard/tokens'
import { MatchGroupList } from '@/components/personal-matches/match-group-list'
import { QueueSection } from '@/components/match-requests/queue-section'
import { PendingMatchActions } from '@/components/match-requests/pending-match-actions'

type Props = {
    title: string
    hint?: string
    /** 섹션 건수. 기본은 entries 길이 — '결과 입력 대기'처럼 세션 수를 더한 값이 필요하면 명시한다 */
    count?: number
    entries: PendingMatchEntry[]
    /** 미확정 행이 아닌 카드(로테이션 세션 카드 등) — 그룹 박스들 뒤에 별도 박스로 이어 붙는다 */
    children?: ReactNode
}

/**
 * 허브 섹션 공용 — 미확정 행들을 표시 그룹(buildMatchGroups)으로 묶어, 같은 로테이션 세션의 게임은
 * 헤더 한 줄 + '게임 N'(group_seq = 입력 순) 카드로, 나머지는 카드 1장씩 그린다.
 * 허브의 행은 세트가 비어 있어 kind가 record/rotation뿐이고(가상 카드 없음), 카드가 곧 실제 행이라
 * id로 버킷을 되찾아 액션을 붙인다. 세 패널(내 차례·상대 대기·이의 제기)이 같은 컴포넌트를 쓴다.
 */
export function PendingMatchSection({ title, hint, count, entries, children }: Props) {
    const bucketById = new Map<string, MatchQueueBucket>(entries.map((e) => [e.match.id, e.bucket]))
    const groups = buildMatchGroups(entries.map((e) => e.match))
    const hasChildren = Children.count(children) > 0

    return (
        <QueueSection title={title} hint={hint} count={count ?? entries.length} unboxed>
            {groups.length > 0 && (
                <MatchGroupList
                    groups={groups}
                    renderActions={(m) => {
                        const bucket = bucketById.get(m.id)
                        return bucket ? <PendingMatchActions match={m} bucket={bucket} /> : undefined
                    }}
                />
            )}
            {hasChildren && <div className={`${CARD_BASE} divide-y divide-border`}>{children}</div>}
        </QueueSection>
    )
}

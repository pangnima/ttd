import type { MatchQueue } from '@/lib/queries/match-queue'
import { CARD_BASE, EMPTY_BLOCK, TYPO } from '@/lib/dashboard/tokens'
import { PersonalMatchCard } from '@/components/personal-matches/personal-match-card'
import { QueueSection } from '@/components/match-requests/queue-section'
import { PendingMatchActions } from '@/components/match-requests/pending-match-actions'
import { ReceivedRequestCard } from '@/components/match-requests/received-request-card'
import { SentRequestCard } from '@/components/match-requests/sent-request-card'

type Props = {
    queue: MatchQueue
    viewerId: string
}

/**
 * 확인 요청 허브 「상대 대기」 탭 — 공이 상대에게 넘어가 있는 것들(뱃지에 세지 않는다).
 * 내 제안 확인 대기 / 상대 수락 대기 / 대표 확인 대기 + 종료된 요청 이력.
 */
export function WaitingPanel({ queue, viewerId }: Props) {
    const waiting = queue.pendingMatches.filter((p) => p.bucket === 'awaitingCounterpart')
    // 제안자가 나면 상대의 확인을, 아니면(복식 파트너·상대2의 관점 행) 대표의 처리를 기다린다
    const [myProposals, repWaiting] = partition(waiting, (p) => !!p.match.confirmation?.proposedByMe)
    const closed = queue.closedRequests

    if (waiting.length === 0 && queue.sentRequests.length === 0 && closed.length === 0) {
        return <div className={EMPTY_BLOCK}>상대를 기다리는 경기가 없습니다.</div>
    }

    return (
        <>
            <QueueSection title="내 제안 확인 대기" hint="상대가 확인하면 확정됩니다" count={myProposals.length}>
                {myProposals.map(({ match, bucket }) => (
                    <PersonalMatchCard
                        key={match.id}
                        match={match}
                        actions={<PendingMatchActions match={match} bucket={bucket} />}
                    />
                ))}
            </QueueSection>

            <QueueSection title="상대 수락 대기" hint="상대가 수락해야 기록이 만들어집니다" count={queue.sentRequests.length}>
                {queue.sentRequests.map((item) => (
                    <SentRequestCard key={item.request.id} item={item} />
                ))}
            </QueueSection>

            <QueueSection title="대표 확인 대기" hint="상대팀 대표가 결과를 확인하면 확정됩니다" count={repWaiting.length}>
                {repWaiting.map(({ match, bucket }) => (
                    <PersonalMatchCard
                        key={match.id}
                        match={match}
                        actions={<PendingMatchActions match={match} bucket={bucket} />}
                    />
                ))}
            </QueueSection>

            {closed.length > 0 && (
                <details className="space-y-2">
                    <summary className={`${TYPO.h3} cursor-pointer select-none`}>
                        종료된 요청 <span className="text-caption text-muted-foreground font-normal">{closed.length}건</span>
                    </summary>
                    <div className={`${CARD_BASE} divide-y divide-border mt-2`}>
                        {closed.map((item) =>
                            item.request.requesterId === viewerId ? (
                                <SentRequestCard key={item.request.id} item={item} />
                            ) : (
                                <ReceivedRequestCard key={item.request.id} item={item} />
                            ),
                        )}
                    </div>
                </details>
            )}
        </>
    )
}

function partition<T>(items: T[], predicate: (item: T) => boolean): [T[], T[]] {
    const yes: T[] = []
    const no: T[] = []
    for (const item of items) (predicate(item) ? yes : no).push(item)
    return [yes, no]
}

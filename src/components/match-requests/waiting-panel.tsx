import type { MatchQueue } from '@/lib/queries/match-queue'
import { CARD_BASE, EMPTY_BLOCK, TYPO } from '@/lib/dashboard/tokens'
import { QueueSection } from '@/components/match-requests/queue-section'
import { PendingMatchSection } from '@/components/match-requests/pending-match-section'
import { ReceivedRequestCard } from '@/components/match-requests/received-request-card'
import { SentRequestCard } from '@/components/match-requests/sent-request-card'
import { AwaitingMemberRequestCard } from '@/components/match-requests/awaiting-member-request-card'
import { RotationSessionInviteCard } from '@/components/match-requests/rotation-session-invite-card'

type Props = {
    queue: MatchQueue
    viewerId: string
}

/**
 * 확인 요청 허브 「상대 대기」 탭 — 공이 상대에게 넘어가 있는 것들(뱃지에 세지 않는다).
 * 남은 참가자 확인 대기 / 상대 수락 대기 / 열람 전용 대기 + 종료된 요청 이력.
 * 이의 상태는 여기 오지 않는다 — 「이의 제기」 탭 전용이다(0061).
 */
export function WaitingPanel({ queue, viewerId }: Props) {
    const waiting = queue.pendingMatches.filter((p) => p.bucket === 'awaitingCounterpart')
    // 내 확인(제안 포함)은 끝났고 남은 좌석을 기다리는 것과, 협상 자격이 없는 관점 행(폴백)을 가른다(0060)
    const myConfirmed = waiting.filter(
        (p) => !!p.match.confirmation && (p.match.confirmation.proposedByMe || p.match.confirmation.confirmedByMe),
    )
    const repWaiting = waiting.filter((p) => !myConfirmed.includes(p))
    const closed = queue.closedRequests

    const awaitingMembers = queue.awaitingMemberRequests
    // 참여는 수락했지만 아직 아무도 결과를 넣지 않은 로테이션 일정 (0057)
    const awaitingOwner = queue.awaitingOwnerSessions

    if (waiting.length === 0 && queue.sentRequests.length === 0
        && awaitingMembers.length === 0 && awaitingOwner.length === 0 && closed.length === 0) {
        return <div className={EMPTY_BLOCK}>상대를 기다리는 경기가 없습니다.</div>
    }

    return (
        <>
            <PendingMatchSection
                title="참가자 확인 대기"
                hint="내 확인은 끝났습니다 — 남은 회원 참가자가 모두 확인하면 확정됩니다"
                entries={myConfirmed}
            />

            <QueueSection title="상대 수락 대기" hint="상대가 수락해야 기록이 만들어집니다" count={queue.sentRequests.length}>
                {queue.sentRequests.map((item) => (
                    <SentRequestCard key={item.request.id} item={item} />
                ))}
            </QueueSection>

            <QueueSection
                title="참가자 수락 대기"
                hint="내 수락은 끝났습니다 — 남은 회원이 수락하면 기록이 만들어집니다"
                count={awaitingMembers.length}
            >
                {awaitingMembers.map((item) => (
                    <AwaitingMemberRequestCard key={item.request.id} item={item} />
                ))}
            </QueueSection>

            <QueueSection
                title="주최자 결과 입력 대기"
                hint="참여를 수락했습니다 — 경기 후 결과가 입력되면 확정 절차가 시작됩니다"
                count={awaitingOwner.length}
            >
                {awaitingOwner.map((s) => (
                    <RotationSessionInviteCard key={s.id} session={s} viewerId={viewerId} readOnly />
                ))}
            </QueueSection>

            <PendingMatchSection
                title="확인 대기 (열람 전용)"
                hint="회원 참가자가 결과를 확인하면 확정됩니다"
                entries={repWaiting}
            />

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

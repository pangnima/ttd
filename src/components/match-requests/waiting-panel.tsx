import type { MatchQueue } from '@/lib/queries/match-queue'
import { CARD_BASE, EMPTY_BLOCK, TYPO } from '@/lib/dashboard/tokens'
import { ReceivedRequestCard } from '@/components/match-requests/received-request-card'
import { SentRequestCard } from '@/components/match-requests/sent-request-card'
import { WaitingRequestGroup } from '@/components/match-requests/waiting-request-group'
import { WaitingResultGroup } from '@/components/match-requests/waiting-result-group'
import { waitingGroupTotals } from '@/lib/match-requests/hub-totals'
import type { RoomParticipant } from '@/lib/personal-matches/rotation-pool'
import type { PoolPickerProps } from '@/components/personal-matches/rotation/pool-editor-block'

type Props = {
    queue: MatchQueue
    viewerId: string
    /** 로테이션 빌더용 — 미응답 세션 카드(게스트 대체 진입점)가 이 탭에 있다(0064) */
    picker: PoolPickerProps
    roomParticipants: Record<string, RoomParticipant[]>
}

/**
 * 확인 요청 허브 「상대 승인 대기」 탭 — 공이 상대에게 넘어가 있는 것들(사이드바 뱃지에 세지 않는다).
 *
 * 이 탭은 이미 **차례 축**으로 갈린 자리이므로 안에서는 **생애 축**으로 묶는다 —
 * 「참여 요청」(수락을 기다린다)과 「경기 결과」(확인·입력을 기다린다)는 기다리는 대상이 다르다.
 * 이의 대기(재입력 대기·재입력 결과 확인 대기)도 여기 경기 결과 그룹에 있다(Week 38 — 종전 「이의 처리」 탭).
 */
export function WaitingPanel({ queue, viewerId, picker, roomParticipants }: Props) {
    const byBucket = (bucket: string) => queue.pendingMatches.filter((p) => p.bucket === bucket)
    const waiting = byBucket('awaitingCounterpart')
    // 내 확인(제안 포함)은 끝났고 남은 좌석을 기다리는 것과, 협상 자격이 없는 관점 행(폴백)을 가른다(0060)
    const myConfirmed = waiting.filter(
        (p) => !!p.match.confirmation && (p.match.confirmation.proposedByMe || p.match.confirmation.confirmedByMe),
    )
    const repWaiting = waiting.filter((p) => !myConfirmed.includes(p))
    const awaitingReentry = byBucket('awaitingReentry')
    const awaitingReentryConfirm = byBucket('awaitingReentryConfirm')
    const closed = queue.closedRequests

    // 빈 상태·탭 배지·그룹 헤딩이 모두 같은 배열 길이에서 나온다 — 숫자와 카드가 갈릴 여지를 없앤다.
    // 접힌 이력(종료된 요청)은 탭 배지에서 빠지지만, 그것만 있어도 빈 상태 문구는 띄우지 않는다.
    const groups = waitingGroupTotals({
        sentRequests: queue.sentRequests.length,
        awaitingMembers: queue.awaitingMemberRequests.length,
        awaitingSeats: queue.awaitingSeatSessions.length,
        myConfirmed: myConfirmed.length,
        awaitingOwner: queue.awaitingOwnerSessions.length,
        repWaiting: repWaiting.length,
        awaitingReentry: awaitingReentry.length,
        awaitingReentryConfirm: awaitingReentryConfirm.length,
    })

    if (groups.request + groups.result === 0 && closed.length === 0) {
        return <div className={EMPTY_BLOCK}>상대를 기다리는 경기가 없습니다.</div>
    }

    return (
        <>
            <WaitingRequestGroup
                queue={queue}
                viewerId={viewerId}
                picker={picker}
                roomParticipants={roomParticipants}
                count={groups.request}
            />

            <WaitingResultGroup
                viewerId={viewerId}
                myConfirmed={myConfirmed}
                repWaiting={repWaiting}
                awaitingOwner={queue.awaitingOwnerSessions}
                awaitingReentry={awaitingReentry}
                awaitingReentryConfirm={awaitingReentryConfirm}
                count={groups.result}
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

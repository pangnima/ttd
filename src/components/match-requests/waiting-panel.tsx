import type { MatchQueue } from '@/lib/queries/match-queue'
import { CARD_BASE, EMPTY_BLOCK, TYPO } from '@/lib/dashboard/tokens'
import { QueueSection } from '@/components/match-requests/queue-section'
import { PendingMatchSection } from '@/components/match-requests/pending-match-section'
import { ReceivedRequestCard } from '@/components/match-requests/received-request-card'
import { SentRequestCard } from '@/components/match-requests/sent-request-card'
import { AwaitingMemberRequestCard } from '@/components/match-requests/awaiting-member-request-card'
import { RotationSessionInviteCard } from '@/components/match-requests/rotation-session-invite-card'
import { RotationSessionCard } from '@/components/personal-matches/rotation-session-card'
import { HubSectionGroup } from '@/components/match-requests/hub-section-group'
import { waitingGroupTotals } from '@/lib/match-requests/hub-totals'
import type { RoomParticipant } from '@/lib/personal-matches/rotation-pool'
import type { PoolPickerProps } from '@/components/personal-matches/rotation/pool-editor-block'

type Props = {
    queue: MatchQueue
    viewerId: string
    /**
     * 로테이션 빌더용 자동완성·방 참가자 (0064). 「상대 승인 대기」 탭이 이것을 받는 이유는
     * **미응답 세션 카드가 무응답 탈출구의 진입점**이기 때문이다 — 주최자는 여기서 팝업을 열어
     * 응답 없는 회원을 게스트로 대체한다. 그 전에는 이 탭에 편집 수단이 필요 없었다.
     */
    picker: PoolPickerProps
    roomParticipants: Record<string, RoomParticipant[]>
}

/**
 * 확인 요청 허브 「상대 승인 대기」 탭 — 공이 상대에게 넘어가 있는 것들(사이드바 뱃지에 세지 않는다).
 *
 * 이 탭은 이미 **차례 축**으로 갈린 자리이므로 안에서는 **생애 축**으로 묶는다 —
 * 「참여 요청」(수락을 기다린다)과 「경기 결과」(확인·입력을 기다린다)는 기다리는 대상이 다르다.
 * 0064에서 '참가자 응답 대기'가 늘어 6섹션이 되면서 묶음 없이는 훑기 어려워졌다.
 *
 * 이의를 거친 협상은 여기 오지 않는다 — 재제안된 뒤에도 「이의 처리」 탭 전용이다(0061·0062).
 */
export function WaitingPanel({ queue, viewerId, picker, roomParticipants }: Props) {
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
    // 아직 응답하지 않은 회원이 남아 결과 입력이 열리지 않은 일정 (0064) — 주최자도 여기서 본다
    const awaitingSeats = queue.awaitingSeatSessions

    // 빈 상태·탭 배지·그룹 헤딩이 모두 같은 배열 길이에서 나온다 — 숫자와 카드가 갈릴 여지를 없앤다.
    // 접힌 이력(종료된 요청)은 탭 배지에서 빠지지만, 그것만 있어도 빈 상태 문구는 띄우지 않는다.
    const groups = waitingGroupTotals({
        myConfirmed: myConfirmed.length,
        repWaiting: repWaiting.length,
        sentRequests: queue.sentRequests.length,
        awaitingMembers: awaitingMembers.length,
        awaitingSeats: awaitingSeats.length,
        awaitingOwner: awaitingOwner.length,
    })

    if (groups.request + groups.result === 0 && closed.length === 0) {
        return <div className={EMPTY_BLOCK}>상대를 기다리는 경기가 없습니다.</div>
    }

    return (
        <>
            <HubSectionGroup title="참여 요청" count={groups.request}>
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

                {/* 0064 — 전원 수락 전에는 결과를 넣을 수 없으므로, 주최자에게도 이 일정은 '대기'다.
                    누구를 기다리는지는 카드의 좌석 명단이 말한다 */}
                <QueueSection
                    title="참가자 응답 대기"
                    hint="초대한 회원이 모두 수락해야 결과를 입력할 수 있습니다 — 응답이 없으면 명단에서 빼고 게스트로 기록할 수 있습니다"
                    count={awaitingSeats.length}
                >
                    {/* 초대 카드가 아니라 세션 카드다 — 팝업 안 참가자 편집이 이 상태를 푸는 유일한 수단이라
                        카드에 그 진입점이 있어야 한다. 저장은 blockedReason이 막는다(0064). */}
                    {awaitingSeats.map((s) => (
                        <RotationSessionCard
                            key={s.id}
                            session={s}
                            picker={picker}
                            viewerId={viewerId}
                            roomParticipants={roomParticipants[s.id] ?? []}
                            enteredGames={queue.enteredGamesBySession.get(s.id) ?? []}
                            resultBlocked
                        />
                    ))}
                </QueueSection>
            </HubSectionGroup>

            <HubSectionGroup title="경기 결과" count={groups.result}>
                <PendingMatchSection
                    title="참가자 확인 대기"
                    hint="내 확인은 끝났습니다 — 남은 회원 참가자가 모두 확인하면 확정됩니다"
                    entries={myConfirmed}
                />

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
            </HubSectionGroup>

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

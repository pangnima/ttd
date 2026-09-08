import type { MatchQueue } from '@/lib/queries/match-queue'
import type { RoomParticipant } from '@/lib/personal-matches/rotation-pool'
import type { PoolPickerProps } from '@/components/personal-matches/rotation/pool-editor-block'
import { QueueSection } from '@/components/match-requests/queue-section'
import { SentRequestCard } from '@/components/match-requests/sent-request-card'
import { AwaitingMemberRequestCard } from '@/components/match-requests/awaiting-member-request-card'
import { RotationSessionCard } from '@/components/personal-matches/rotation-session-card'
import { HubSectionGroup } from '@/components/match-requests/hub-section-group'

type Props = {
    queue: MatchQueue
    viewerId: string
    /**
     * 로테이션 빌더용 자동완성·방 참가자 (0064). 「상대 승인 대기」가 이것을 받는 이유는
     * **미응답 세션 카드가 무응답 탈출구의 진입점**이기 때문이다 — 주최자는 여기서 팝업을 열어
     * 응답 없는 회원을 게스트로 대체한다.
     */
    picker: PoolPickerProps
    roomParticipants: Record<string, RoomParticipant[]>
    /** 그룹 헤딩의 건수 — 패널이 waitingGroupTotals로 만든 값(세 배열 길이의 합) */
    count: number
}

/** 「상대 승인 대기 › 참여 요청」 — 수락을 기다리는 것들. 세 섹션 모두 queue의 배열을 그대로 그린다 */
export function WaitingRequestGroup({ queue, viewerId, picker, roomParticipants, count }: Props) {
    const awaitingMembers = queue.awaitingMemberRequests
    // 아직 응답하지 않은 회원이 남아 결과 입력이 열리지 않은 일정 (0064) — 주최자도 여기서 본다
    const awaitingSeats = queue.awaitingSeatSessions

    return (
        <HubSectionGroup title="참여 요청" count={count}>
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
    )
}

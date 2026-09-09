import type { MatchQueue } from '@/lib/queries/match-queue'
import { groupRotationRequests } from '@/lib/match-requests/participants'
import { QueueSection } from '@/components/match-requests/queue-section'
import { ReceivedRequestCard } from '@/components/match-requests/received-request-card'
import { RoomInviteCard } from '@/components/match-rooms/room-invite-card'
import { RotationRequestGroupCard } from '@/components/match-requests/rotation-request-group-card'
import { RotationSessionInviteCard } from '@/components/match-requests/rotation-session-invite-card'

type Props = { queue: MatchQueue; viewerId: string; attention?: boolean }

/**
 * 「승인 요청 › 초대」의 섹션 '경기 참여 확인' — 아직 personal_matches 행이 없는 A축 단계(받은 요청·로테이션 일정 초대·방 초대).
 * 건수(counts.participation)는 **카드 단위**다 — 로테이션 세션은 게임이 몇 개든 한 장으로 묶이고(0056)
 * 조립부가 같은 groupRotationRequests로 세므로 카드 1장 = 1건이다.
 * (0056 이전에는 요청 단위라 카드보다 컸고, 그 시절 주석이 0064까지 남아 있었다.)
 */
export function ParticipationSection({ queue, viewerId, attention }: Props) {
    // 로테이션 세션에서 파생된 요청은 세션 한 장으로 묶는다(0056).
    // 조립부(match-queue.ts)가 같은 함수로 counts.participation을 세므로 숫자와 카드가 어긋나지 않는다.
    const received = groupRotationRequests(queue.receivedRequests)

    return (
        <QueueSection
            title="경기 참여 확인"
            hint="수락하면 양쪽 기록에 함께 남습니다"
            count={queue.counts.participation}
            attention={attention}
        >
            {/* 로테이션은 게임마다 요청이 생기지만 참여 동의의 단위는 세션이라 한 장으로 묶는다(0056) */}
            {received.sessions.map(({ sessionId, items }) => (
                <RotationRequestGroupCard key={sessionId} sessionId={sessionId} items={items} />
            ))}
            {received.singles.map((item) => (
                <ReceivedRequestCard key={item.request.id} item={item} />
            ))}
            {/* 로테이션 '일정' 초대 — 게임이 아직 없거나, 있어도 내 좌석이 요청에 없는 세션.
                주최자가 수락 전에 결과를 먼저 넣으면 같은 세션이 위 묶음 카드와 겹치므로
                fetchMatchQueue가 상류에서 중복을 걷어낸다(0063) — 여기서는 조건을 두지 않는다 */}
            {queue.sessionInvites.map((s) => (
                <RotationSessionInviteCard key={s.id} session={s} viewerId={viewerId} />
            ))}
            {queue.roomInvites.map((invite) => (
                <RoomInviteCard key={invite.roomId} invite={invite} />
            ))}
        </QueueSection>
    )
}

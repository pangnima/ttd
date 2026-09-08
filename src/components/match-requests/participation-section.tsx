import type { MatchQueue } from '@/lib/queries/match-queue'
import { groupRotationRequests } from '@/lib/match-requests/participants'
import { QueueSection } from '@/components/match-requests/queue-section'
import { ReceivedRequestCard } from '@/components/match-requests/received-request-card'
import { RoomInviteCard } from '@/components/match-requests/room-invite-card'
import { RotationRequestGroupCard } from '@/components/match-requests/rotation-request-group-card'
import { RotationSessionInviteCard } from '@/components/match-requests/rotation-session-invite-card'

type Props = { queue: MatchQueue; viewerId: string }

/**
 * 「내 차례」 첫 섹션 '경기 참여 확인' — 아직 personal_matches 행이 없는 A축 단계(받은 요청·로테이션 일정 초대·방 초대).
 * 건수는 요청 단위(counts.participation)라 로테이션 묶음 카드 수보다 클 수 있다.
 */
export function ParticipationSection({ queue, viewerId }: Props) {
    // 로테이션 세션에서 파생된 요청은 세션 한 장으로 묶는다(0056) — 카드 수는 줄어도 건수는 요청 단위다
    const received = groupRotationRequests(queue.receivedRequests)

    return (
        <QueueSection
            title="경기 참여 확인"
            hint="수락하면 양쪽 기록에 함께 남습니다"
            count={queue.counts.participation}
        >
            {/* 로테이션은 게임마다 요청이 생기지만 참여 동의의 단위는 세션이라 한 장으로 묶는다(0056) */}
            {received.sessions.map(({ sessionId, items }) => (
                <RotationRequestGroupCard key={sessionId} sessionId={sessionId} items={items} />
            ))}
            {received.singles.map((item) => (
                <ReceivedRequestCard key={item.request.id} item={item} />
            ))}
            {/* 로테이션 '일정' 초대 — 아직 게임이 없어 요청도 기록도 없는 단계다(0057) */}
            {queue.sessionInvites.map((s) => (
                <RotationSessionInviteCard key={s.id} session={s} viewerId={viewerId} />
            ))}
            {queue.roomInvites.map((invite) => (
                <RoomInviteCard key={invite.roomId} invite={invite} />
            ))}
        </QueueSection>
    )
}

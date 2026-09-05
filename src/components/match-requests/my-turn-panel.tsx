import Link from 'next/link'
import type { MatchQueue } from '@/lib/queries/match-queue'
import type { RoomParticipant } from '@/lib/personal-matches/rotation-pool'
import type { PoolPickerProps } from '@/components/personal-matches/rotation/pool-editor-block'
import { myTurnTotal, type MatchQueueBucket } from '@/lib/match-requests/queue'
import { EMPTY_BLOCK } from '@/lib/dashboard/tokens'
import { PersonalMatchCard } from '@/components/personal-matches/personal-match-card'
import { RotationSessionCard } from '@/components/personal-matches/rotation-session-card'
import { QueueSection } from '@/components/match-requests/queue-section'
import { PendingMatchActions } from '@/components/match-requests/pending-match-actions'
import { ReceivedRequestCard } from '@/components/match-requests/received-request-card'
import { RoomInviteCard } from '@/components/match-requests/room-invite-card'

type Props = {
    queue: MatchQueue
    viewerId: string
    picker: PoolPickerProps
    /** 세션 id → 방 참가자(나 제외). 방 세션의 빌더 풀 파생에 쓴다(0050) */
    roomParticipants: Record<string, RoomParticipant[]>
}

/**
 * 확인 요청 허브 「내 차례」 탭 — 지금 내가 처리해야 할 것만 모은다(사이드바 뱃지와 같은 집합).
 * 섹션 순서 = 처리 우선순위: 참여 확인 → 결과 확인 → 결과 입력 → 참가자 채우기.
 */
export function MyTurnPanel({ queue, viewerId, picker, roomParticipants }: Props) {
    const { counts, pendingMatches, rotationSessions, enteredSessionIds } = queue
    const entered = new Set(enteredSessionIds)
    const byBucket = (bucket: MatchQueueBucket) => pendingMatches.filter((p) => p.bucket === bucket)

    // 이미 게임을 넣은 방 세션은 뱃지에서 빠지지만(enteredSessionIds) 카드는 계속 노출한다 —
    // 참가자가 나중에 게임을 더 넣을 수 있으므로 빈 상태로 덮어 감추면 안 된다
    if (myTurnTotal(counts) === 0 && rotationSessions.length === 0) {
        return (
            <div className={EMPTY_BLOCK}>
                확인할 경기가 없습니다.{' '}
                <Link href="/me/personal-matches" className="text-primary hover:underline">
                    확정된 경기는 개인 경기 결과에서 볼 수 있습니다
                </Link>
            </div>
        )
    }

    const confirmList = byBucket('confirmResult')
    const enterList = byBucket('enterResult')
    const fillList = byBucket('fillLineup')

    return (
        <>
            <QueueSection
                title="경기 참여 확인"
                hint="수락하면 양쪽 기록에 함께 남습니다"
                count={queue.receivedRequests.length + queue.roomInvites.length}
            >
                {queue.receivedRequests.map((item) => (
                    <ReceivedRequestCard key={item.request.id} item={item} />
                ))}
                {queue.roomInvites.map((invite) => (
                    <RoomInviteCard key={invite.roomId} invite={invite} />
                ))}
            </QueueSection>

            <QueueSection title="결과 확인 대기" hint="상대가 제안한 결과를 확인해주세요" count={confirmList.length}>
                {confirmList.map(({ match, bucket }) => (
                    <PersonalMatchCard
                        key={match.id}
                        match={match}
                        actions={<PendingMatchActions match={match} bucket={bucket} />}
                    />
                ))}
            </QueueSection>

            {/* 숫자는 뱃지(myTurnTotal)와 같은 counts를 쓴다 — 이미 입력한 방 세션 카드는
                아래에 계속 보이지만(추가 입력 가능) '내 차례'로는 세지 않는다 */}
            <QueueSection
                title="결과 입력 대기"
                hint="게임 스코어를 넣으면 전적에 확정됩니다"
                count={counts.enterResult}
            >
                {enterList.map(({ match, bucket }) => (
                    <PersonalMatchCard
                        key={match.id}
                        match={match}
                        actions={<PendingMatchActions match={match} bucket={bucket} />}
                    />
                ))}
                {rotationSessions.map((s) => (
                    <RotationSessionCard
                        key={s.id}
                        session={s}
                        picker={picker}
                        viewerId={viewerId}
                        roomParticipants={roomParticipants[s.id] ?? []}
                        entered={entered.has(s.id)}
                    />
                ))}
            </QueueSection>

            <QueueSection title="참가자 채우기" hint="참가자가 정해져야 결과를 넣을 수 있습니다" count={fillList.length}>
                {fillList.map(({ match, bucket }) => (
                    <PersonalMatchCard
                        key={match.id}
                        match={match}
                        actions={<PendingMatchActions match={match} bucket={bucket} />}
                    />
                ))}
            </QueueSection>
        </>
    )
}

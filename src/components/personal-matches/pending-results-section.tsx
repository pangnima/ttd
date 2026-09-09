import type { MatchQueue } from '@/lib/queries/match-queue'
import type { RotationBuilderContext } from '@/lib/queries/rotation-builder-context'
import { todayIsoKst } from '@/lib/match-rooms/split'
import { isDormantSession } from '@/lib/personal-matches/session-visibility'
import { PendingMatchSection } from '@/components/personal-matches/pending-match-section'
import { RotationSessionCard } from '@/components/personal-matches/rotation-session-card'

type Props = {
    queue: MatchQueue
    viewerId: string
    builder: RotationBuilderContext
}

/**
 * 개인 경기 결과 상단 「결과 입력 대기」 — **방 밖 기록만** (Week 39).
 *
 * 미확정 행 하나가 놓이는 자리는 room_id가 가른다: 방에 속한 것은 매칭 룸(과 매칭 리스트의 내 차례 필)이
 * 그리고, 방 밖 기록 — 즉 비회원과 친 직접 기록 — 만 여기 남는다. 방 밖 기록에는 확인해 줄 상대가 없으므로
 * 내가 스코어를 넣는 순간 확정된다.
 *
 * 일정 카드는 게임이 전부 확정되고 경기일이 지나면 숨긴다(isDormantSession). 숫자는 그려지는 카드 수다.
 */
export function PendingResultsSection({ queue, viewerId, builder }: Props) {
    const entries = queue.pendingMatches.filter((p) => !p.match.roomId && p.bucket === 'enterResult')
    const today = todayIsoKst()
    const sessions = queue.rotationSessions.filter((s) => !s.roomId && !isDormantSession(
        s,
        queue.enteredGamesBySession.get(s.id) ?? [],
        queue.pendingMatches.some((p) => p.match.rotationSessionId === s.id),
        today,
    ))

    return (
        <PendingMatchSection
            title="결과 입력 대기"
            hint="게임 스코어를 넣으면 곧바로 확정됩니다"
            count={entries.length + sessions.length}
            entries={entries}
        >
            {sessions.map((s) => (
                <RotationSessionCard
                    key={s.id}
                    session={s}
                    picker={builder.picker}
                    viewerId={viewerId}
                    roomParticipants={builder.roomParticipants[s.id] ?? []}
                    enteredGames={queue.enteredGamesBySession.get(s.id) ?? []}
                />
            ))}
        </PendingMatchSection>
    )
}

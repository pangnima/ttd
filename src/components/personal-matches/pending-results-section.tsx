import type { MatchQueue } from '@/lib/queries/match-queue'
import type { RotationBuilderContext } from '@/lib/queries/rotation-builder-context'
import { todayIsoKst } from '@/lib/match-rooms/split'
import { isDormantSession } from '@/lib/personal-matches/session-visibility'
import { PendingMatchSection } from '@/components/match-requests/pending-match-section'
import { RotationSessionCard } from '@/components/personal-matches/rotation-session-card'

type Props = {
    queue: MatchQueue
    viewerId: string
    builder: RotationBuilderContext
}

/**
 * 개인 경기 결과 상단 「결과 입력 대기」 — 전원 수락이 끝났지만 아직 스코어가 없는 것들 (Week 38).
 *
 * 0064까지는 허브 「경기 결과 확정」에 있었다. 사용자가 정의한 흐름은 "승인이 끝나면 개인 경기 결과로"이고
 * 결과 입력은 승인이 아니므로 여기가 맞다 — 허브는 승인 전용이 된다. 누군가 입력하면 나머지 좌석에게는
 * 허브 '결과 확인 대기'로 돌아가고, 전원이 확인하면 이 화면의 확정 목록으로 내려온다.
 *
 * 카드: 미확정 행(enterResult — 상호 확인 경기·자유 기록) + 입력 가능한 로테이션 일정.
 * 일정 카드는 게임이 전부 확정되고 경기일이 지나면 숨긴다(isDormantSession). 숫자는 그려지는 카드 수다.
 */
export function PendingResultsSection({ queue, viewerId, builder }: Props) {
    const entries = queue.pendingMatches.filter((p) => p.bucket === 'enterResult')
    const today = todayIsoKst()
    const sessions = queue.rotationSessions.filter((s) => !isDormantSession(
        s,
        queue.enteredGamesBySession.get(s.id) ?? [],
        queue.pendingMatches.some((p) => p.match.rotationSessionId === s.id),
        today,
    ))

    return (
        <PendingMatchSection
            title="결과 입력 대기"
            hint="게임 스코어를 넣으면 회원 참가자 전원의 확인을 거쳐 확정됩니다"
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

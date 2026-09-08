import Link from 'next/link'
import type { MatchQueue } from '@/lib/queries/match-queue'
import type { RoomParticipant } from '@/lib/personal-matches/rotation-pool'
import type { PoolPickerProps } from '@/components/personal-matches/rotation/pool-editor-block'
import { myTurnTotal, type MatchQueueBucket } from '@/lib/match-requests/queue'
import { EMPTY_BLOCK } from '@/lib/dashboard/tokens'
import { RotationSessionCard } from '@/components/personal-matches/rotation-session-card'
import { ParticipationSection } from '@/components/match-requests/participation-section'
import { PendingMatchSection } from '@/components/match-requests/pending-match-section'

type Props = {
    queue: MatchQueue
    viewerId: string
    picker: PoolPickerProps
    /** 세션 id → 방 참가자(나 제외). 방 세션의 빌더 풀 파생에 쓴다(0050) */
    roomParticipants: Record<string, RoomParticipant[]>
}

/**
 * 확인 요청 허브 「내 차례」 탭 — 지금 내가 처리해야 할 것만 모은다.
 * 섹션 순서 = 처리 우선순위: 참여 확인 → 결과 확인 → 결과 입력 → 참가자 채우기.
 * 이의 재입력은 「이의 제기」 탭이 담당한다(0061) — 사이드바 뱃지 = 이 탭 배지 + 이의 탭 배지.
 */
export function MyTurnPanel({ queue, viewerId, picker, roomParticipants }: Props) {
    const { counts, pendingMatches, rotationSessions, enteredSessionIds } = queue
    const entered = new Set(enteredSessionIds)
    const byBucket = (bucket: MatchQueueBucket) => pendingMatches.filter((p) => p.bucket === bucket)

    // 이미 게임을 넣은 방 세션은 뱃지에서 빠지지만(enteredSessionIds) 카드는 계속 노출한다 —
    // 참가자가 나중에 게임을 더 넣을 수 있으므로 빈 상태로 덮어 감추면 안 된다
    if (myTurnTotal(counts) - counts.reenterResult === 0 && rotationSessions.length === 0) {
        return (
            <div className={EMPTY_BLOCK}>
                확인할 경기가 없습니다.{' '}
                <Link href="/me/personal-matches" className="text-primary hover:underline">
                    확정된 경기는 개인 경기 결과에서 볼 수 있습니다
                </Link>
            </div>
        )
    }

    return (
        <>
            <ParticipationSection queue={queue} viewerId={viewerId} />

            <PendingMatchSection
                title="결과 확인 대기"
                hint="제안된 결과를 확인해주세요 — 회원 참가자 전원이 확인하면 확정됩니다"
                entries={byBucket('confirmResult')}
            />

            {/* 숫자는 뱃지(myTurnTotal)와 같은 counts를 쓴다 — 이미 입력한 방 세션 카드는
                아래에 계속 보이지만(추가 입력 가능) '내 차례'로는 세지 않는다 */}
            <PendingMatchSection
                title="결과 입력 대기"
                hint="게임 스코어를 넣으면 전적에 확정됩니다"
                count={counts.enterResult}
                entries={byBucket('enterResult')}
            >
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
            </PendingMatchSection>

            <PendingMatchSection
                title="참가자 채우기"
                hint="참가자가 정해져야 결과를 넣을 수 있습니다"
                entries={byBucket('fillLineup')}
            />
        </>
    )
}

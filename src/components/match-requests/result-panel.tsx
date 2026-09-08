import Link from 'next/link'
import type { MatchQueue } from '@/lib/queries/match-queue'
import type { RoomParticipant } from '@/lib/personal-matches/rotation-pool'
import type { PoolPickerProps } from '@/components/personal-matches/rotation/pool-editor-block'
import type { MatchQueueBucket } from '@/lib/match-requests/queue'
import { enterResultCards, hubTabTotals } from '@/lib/match-requests/hub-totals'
import { EMPTY_BLOCK } from '@/lib/dashboard/tokens'
import { RotationSessionCard } from '@/components/personal-matches/rotation-session-card'
import { PendingMatchSection } from '@/components/match-requests/pending-match-section'

type Props = {
    queue: MatchQueue
    viewerId: string
    picker: PoolPickerProps
    /** 세션 id → 방 참가자(나 제외). 방 세션의 빌더 풀 파생에 쓴다(0050) */
    roomParticipants: Record<string, RoomParticipant[]>
}

/**
 * 확인 요청 허브 「승인 요청 › 경기 결과 확정」 — 결과가 **내 손을** 기다리는 것들.
 *
 * 위부터: 제안된 결과 확인(승인 — '승인 필요' 필) → 결과 입력(내가 값을 만드는 일) → 참가자 채우기(입력의 앞 단계, 0047).
 * 0064까지는 확인이 「승인 요청」, 입력·라인업이 「경기 확정 대기」로 탭이 갈라져 있었다.
 * 한 탭으로 합친 이유는 사용자의 정의가 "결과에 대한 처리"이기 때문이고, 무게의 차이는 탭 대신 순서와 악센트가 말한다.
 */
export function ResultPanel({ queue, viewerId, picker, roomParticipants }: Props) {
    const { counts, pendingMatches, rotationSessions, enteredGamesBySession } = queue
    const byBucket = (bucket: MatchQueueBucket) => pendingMatches.filter((p) => p.bucket === bucket)

    if (hubTabTotals(counts).result === 0) {
        return (
            <div className={EMPTY_BLOCK}>
                결과를 기다리는 경기가 없습니다.{' '}
                <Link href="/me/personal-matches/new" className="text-primary hover:underline">
                    새 경기를 기록해보세요
                </Link>
            </div>
        )
    }

    return (
        <>
            <PendingMatchSection
                title="결과 확인 대기"
                hint="제안된 결과를 확인해주세요 — 회원 참가자 전원이 확인하면 확정됩니다"
                entries={byBucket('confirmResult')}
                attention
            />

            {/* 숫자는 **그려지는 카드 수**다(enterResultCards) — 미확정 행 + 로테이션 세션 카드 전량.
                이미 게임을 넣은 세션 카드도 계속 보이므로(참가자가 더 넣을 수 있다) 그 몫까지 센다.
                ⚠ counts.enterResult(내 차례)를 그대로 넘기면 0이 될 때 QueueSection의 0-게이트가
                아래 세션 카드까지 삼켜 탭이 백지가 된다 — 실제로 그랬다. */}
            <PendingMatchSection
                title="결과 입력 대기"
                hint="게임 스코어를 넣으면 회원 참가자 전원의 확인을 거쳐 확정됩니다"
                count={enterResultCards(counts)}
                entries={byBucket('enterResult')}
            >
                {rotationSessions.map((s) => (
                    <RotationSessionCard
                        key={s.id}
                        session={s}
                        picker={picker}
                        viewerId={viewerId}
                        roomParticipants={roomParticipants[s.id] ?? []}
                        enteredGames={enteredGamesBySession.get(s.id) ?? []}
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

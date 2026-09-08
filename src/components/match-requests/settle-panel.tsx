import Link from 'next/link'
import type { MatchQueue } from '@/lib/queries/match-queue'
import type { RoomParticipant } from '@/lib/personal-matches/rotation-pool'
import type { PoolPickerProps } from '@/components/personal-matches/rotation/pool-editor-block'
import type { MatchQueueBucket } from '@/lib/match-requests/queue'
import { enterResultCards, settleTabTotal } from '@/lib/match-requests/hub-totals'
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
 * 확인 요청 허브 「경기 확정 대기」 탭 — 내가 **채워 넣어야** 확정되는 것들.
 *
 * 「승인 요청」에서 갈라져 나온 탭이다. 승인은 남의 제안에 답하는 일이고, 이쪽은 내가 값을 만드는
 * 일이라 무게도 소요 시간도 다르다 — 스코어를 넣으려면 경기 내용을 기억해야 하고, 로테이션은
 * 게임을 여러 개 구성해야 한다. 한 탭에 섞여 있을 때는 "수락 하나만 누르면 되는데" 하고 들어왔다가
 * 입력거리까지 함께 마주쳐야 했다.
 *
 * 참가자 채우기가 여기 있는 이유: 라인업이 차야 결과를 넣을 수 있어(0047) 같은 흐름의 앞 단계다.
 */
export function SettlePanel({ queue, viewerId, picker, roomParticipants }: Props) {
    const { counts, pendingMatches, rotationSessions, enteredGamesBySession } = queue
    const byBucket = (bucket: MatchQueueBucket) => pendingMatches.filter((p) => p.bucket === bucket)

    if (settleTabTotal(counts) === 0) {
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

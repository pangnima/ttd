import Link from 'next/link'
import type { MatchQueue } from '@/lib/queries/match-queue'
import type { MatchQueueBucket } from '@/lib/match-requests/queue'
import { hubTabTotals } from '@/lib/match-requests/hub-totals'
import { EMPTY_BLOCK } from '@/lib/dashboard/tokens'
import { PendingMatchSection } from '@/components/match-requests/pending-match-section'

type Props = { queue: MatchQueue }

/**
 * 확인 요청 허브 「승인 요청 › 경기 결과 확정」 — 제안된 결과를 **승인**할 것 + 참가자를 채워야 성립하는 것.
 *
 * 결과 **입력**은 여기 없다(Week 38). 전원 수락이 끝난 경기·로테이션 일정은 승인할 것이 없으므로
 * 허브를 떠나 개인 경기 결과 목록의 「결과 입력 대기」에서 입력한다 — 허브는 승인 전용이다.
 * 누군가 입력하면 나머지 좌석에게 이 탭의 '결과 확인 대기'로 다시 돌아온다.
 */
export function ResultPanel({ queue }: Props) {
    const { counts, pendingMatches } = queue
    const byBucket = (bucket: MatchQueueBucket) => pendingMatches.filter((p) => p.bucket === bucket)

    if (hubTabTotals(counts).result === 0) {
        return (
            <div className={EMPTY_BLOCK}>
                확인할 결과가 없습니다.{' '}
                <Link href="/me/personal-matches" className="text-primary hover:underline">
                    결과 입력은 개인 경기 결과에서
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

            <PendingMatchSection
                title="참가자 채우기"
                hint="참가자가 정해져야 결과를 넣을 수 있습니다"
                entries={byBucket('fillLineup')}
            />
        </>
    )
}

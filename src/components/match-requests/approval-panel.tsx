import Link from 'next/link'
import type { MatchQueue } from '@/lib/queries/match-queue'
import type { MatchQueueBucket } from '@/lib/match-requests/queue'
import { mineTabTotal } from '@/lib/match-requests/hub-totals'
import { EMPTY_BLOCK } from '@/lib/dashboard/tokens'
import { ParticipationSection } from '@/components/match-requests/participation-section'
import { PendingMatchSection } from '@/components/match-requests/pending-match-section'

type Props = {
    queue: MatchQueue
    viewerId: string
}

/**
 * 확인 요청 허브 「승인 요청」 탭 — 남이 요청했고 **내가 답해야** 하는 것만 모은다.
 *
 * 두 섹션 다 '승인'이라는 한 가지 성질이다: 참여를 수락할 것인가(경기가 성립하는가),
 * 제안된 결과를 확인할 것인가(스코어가 맞는가). 어느 쪽이든 내가 값을 만들지 않고 남의 제안에 답한다.
 * 내가 **채워 넣어야** 하는 것(결과 입력·참가자 채우기)은 성격이 달라 「경기 확정 대기」 탭이 담당한다.
 *
 * 이의를 거친 협상은 「이의 처리」 탭이 담당한다(0061·0062).
 */
export function ApprovalPanel({ queue, viewerId }: Props) {
    const { counts, pendingMatches } = queue
    const byBucket = (bucket: MatchQueueBucket) => pendingMatches.filter((p) => p.bucket === bucket)

    // 빈 상태 판정은 탭 배지와 **같은 함수**를 쓴다 — 두 술어가 갈리면 '배지 0인데 카드 있음'이나
    // 그 반대가 정상 상태로 성립한다. 0062가 실제로 그렇게 어긋나 빈 화면이 났다.
    if (mineTabTotal(counts) === 0) {
        return (
            <div className={EMPTY_BLOCK}>
                승인할 요청이 없습니다.{' '}
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
        </>
    )
}

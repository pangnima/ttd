import Link from 'next/link'
import type { MatchQueue } from '@/lib/queries/match-queue'
import { hubTabTotals } from '@/lib/match-requests/hub-totals'
import { EMPTY_BLOCK } from '@/lib/dashboard/tokens'
import { ParticipationSection } from '@/components/match-requests/participation-section'

type Props = {
    queue: MatchQueue
    viewerId: string
}

/**
 * 확인 요청 허브 「승인 요청 › 초대」 — 참여를 **수락**할 것만 모은다(받은 요청·로테이션 일정 초대·매칭 룸 초대).
 * 카드 전부가 내 승인을 기다리므로 섹션에 '승인 필요'가 붙고, 이 탭의 카드 수 = 내 차례다.
 */
export function InvitePanel({ queue, viewerId }: Props) {
    // 빈 상태 판정은 탭 배지와 **같은 함수**를 쓴다 — 두 술어가 갈리면 '배지 0인데 카드 있음'이나
    // 그 반대가 정상 상태로 성립한다. 0062가 실제로 그렇게 어긋나 빈 화면이 났다.
    if (hubTabTotals(queue.counts).invite === 0) {
        return (
            <div className={EMPTY_BLOCK}>
                승인할 초대가 없습니다.{' '}
                <Link href="/me/personal-matches" className="text-primary hover:underline">
                    확정된 경기는 개인 경기 결과에서 볼 수 있습니다
                </Link>
            </div>
        )
    }

    return <ParticipationSection queue={queue} viewerId={viewerId} attention />
}

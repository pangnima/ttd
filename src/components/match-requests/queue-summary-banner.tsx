import Link from 'next/link'
import type { MatchQueueCounts } from '@/lib/match-requests/queue'
import { disputeMyTurnTotal, mineTabMyTurn, myTurnTotal, settleTabMyTurn } from '@/lib/match-requests/queue'
import { CARD_BASE } from '@/lib/dashboard/tokens'

type Props = { counts: MatchQueueCounts }

/**
 * 개인 경기 결과 화면 상단 요약 — 확정 목록에서 빠진 미확정 건수를 알리고 허브로 보낸다.
 * 처리할 게 없으면(내 차례 0건) 렌더하지 않는다 — 상시 노출되는 잡음을 만들지 않기 위함.
 */
export function QueueSummaryBanner({ counts }: Props) {
    if (myTurnTotal(counts) === 0) return null

    // 조각 하나 = 허브 탭 하나. 사용자가 어느 탭으로 가야 하는지 문구가 그대로 알려준다 —
    // 셋을 더하면 사이드바 뱃지(myTurnTotal)와 같다.
    const approve = mineTabMyTurn(counts)
    const settle = settleTabMyTurn(counts)
    const dispute = disputeMyTurnTotal(counts)
    const parts = [
        approve > 0 && `승인 요청 ${approve}건`,
        settle > 0 && `경기 확정 대기 ${settle}건`,
        dispute > 0 && `이의 처리 ${dispute}건`,
    ].filter((v): v is string => !!v)

    return (
        <div className={`${CARD_BASE} flex items-center justify-between gap-3 px-4 py-3`}>
            <p className="text-body2 text-spot min-w-0">
                <span aria-hidden className="mr-1.5">⏳</span>
                {parts.join(' · ')}
            </p>
            <Link href="/me/match-requests" className="text-body2 font-medium text-primary hover:underline whitespace-nowrap shrink-0">
                확인 요청 가기 →
            </Link>
        </div>
    )
}

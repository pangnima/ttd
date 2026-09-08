import Link from 'next/link'
import type { MatchQueueCounts } from '@/lib/match-requests/queue'
import { myTurnTotal } from '@/lib/match-requests/queue'
import { firstMyTurnTab, hubTabMyTurn } from '@/lib/match-requests/hub-totals'
import { HUB_SUB_TABS, hubTabHref } from '@/lib/match-requests/tabs'
import { CARD_BASE } from '@/lib/dashboard/tokens'

type Props = { counts: MatchQueueCounts }

/**
 * 개인 경기 결과 화면 상단 요약 — 확정 목록에서 빠진 미확정 건수를 알리고 허브로 보낸다.
 * 처리할 게 없으면(내 차례 0건) 렌더하지 않는다 — 상시 노출되는 잡음을 만들지 않기 위함.
 */
export function QueueSummaryBanner({ counts }: Props) {
    if (myTurnTotal(counts) === 0) return null

    // 조각 하나 = 승인 요청의 하위 탭 하나. 라벨은 탭 메타를 그대로 써서 문구가 곧 가야 할 탭 이름이다 —
    // 셋을 더하면 사이드바 뱃지(myTurnTotal)와 같다. 링크는 내 차례가 있는 첫 하위 탭에 착지한다.
    const mine = hubTabMyTurn(counts)
    const parts = HUB_SUB_TABS
        .filter((t) => mine[t.key] > 0)
        .map((t) => `${t.label} ${mine[t.key]}건`)

    return (
        <div className={`${CARD_BASE} flex items-center justify-between gap-3 px-4 py-3`}>
            <p className="text-body2 text-spot min-w-0">
                <span aria-hidden className="mr-1.5">⏳</span>
                {parts.join(' · ')}
            </p>
            <Link
                href={hubTabHref(firstMyTurnTab(counts))}
                className="text-body2 font-medium text-primary hover:underline whitespace-nowrap shrink-0"
            >
                확인 요청 가기 →
            </Link>
        </div>
    )
}

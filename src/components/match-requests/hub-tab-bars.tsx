import type { MatchQueueCounts } from '@/lib/match-requests/queue'
import { HUB_SUB_TABS, HUB_TOP_TABS, hubTopOf, type HubTab } from '@/lib/match-requests/tabs'
import { hubTabHasMyTurn, hubTabTotals, hubTopHasMyTurn, hubTopTotals } from '@/lib/match-requests/hub-totals'
import { LinkTabs } from '@/components/common/link-tabs'

type Props = { activeTab: HubTab; counts: MatchQueueCounts }

/**
 * 확인 요청 허브의 2단 탭 바 (서버 컴포넌트).
 * 최상위(승인 요청 / 상대 승인 대기)는 항상, 하위(초대 / 경기 결과 확정 / 이의 신청)는 승인 요청 아래에서만 그린다.
 *
 * 배지 = **그 자리에 그려지는 카드 수**, 강조 = 그 자리에 내 차례가 있는가 (hub-totals.ts).
 * 사이드바 뱃지(myTurnTotal)와는 다른 질문에 답한다 — 하나는 목차, 하나는 알림이다.
 * 승인 요청의 배지는 하위 세 탭의 합이라 "여기 N건이 있다"와 "하위 탭 배지의 합"이 언제나 같다.
 */
export function HubTabBars({ activeTab, counts }: Props) {
    const top = hubTopOf(activeTab)
    const topTotals = hubTopTotals(counts)
    const topMyTurn = hubTopHasMyTurn(counts)
    const subTotals = hubTabTotals(counts)
    const subMyTurn = hubTabHasMyTurn(counts)

    return (
        <div className="space-y-1">
            <LinkTabs
                ariaLabel="확인 요청 탭"
                activeKey={top}
                items={HUB_TOP_TABS.map((t) => ({ ...t, count: topTotals[t.key], emphasis: topMyTurn[t.key] }))}
            />
            {top === 'mine' && (
                <LinkTabs
                    ariaLabel="승인 요청 하위 탭"
                    activeKey={activeTab}
                    items={HUB_SUB_TABS.map((t) => ({ ...t, count: subTotals[t.key], emphasis: subMyTurn[t.key] }))}
                />
            )}
        </div>
    )
}

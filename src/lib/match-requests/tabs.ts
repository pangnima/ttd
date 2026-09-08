/**
 * 확인 요청 허브 3탭 — 내 차례 / 상대 대기 / 이의 처리 (0061, 0062).
 * 세 탭은 **상호배타**다: 미확정 행 하나는 정확히 한 탭에만 나온다(분류는 queue.ts classifyPendingMatch).
 * 사이드바 뱃지(myTurnTotal) = 내 차례 탭 배지 + 이의 탭 배지 — 이의 탭에도 내 차례인 것이 둘 있다
 * (다시 입력할 차례 · 재입력된 결과 확인).
 *
 * 라벨이 '이의 제기'가 아니라 '이의 처리'인 이유(0062): 이 탭은 disputed 상태만이 아니라 **이의를 거친
 * 협상의 생애 전체**를 확정될 때까지 담는다. 키는 `disputed`로 유지해 기존 `?tab=disputed` 링크를 보존한다.
 * 매칭 리스트의 lib/match-rooms/tabs.ts와 같은 관용구다.
 */

export type HubTab = 'mine' | 'waiting' | 'disputed'

/** 기본 탭은 `?tab=`을 붙이지 않아 `/me/match-requests`가 정규 주소로 남는다 */
export function hubTabHref(tab: HubTab): string {
    return tab === 'mine' ? '/me/match-requests' : `/me/match-requests?tab=${tab}`
}

export const HUB_TABS: { key: HubTab; label: string; href: string }[] = [
    { key: 'mine', label: '내 차례', href: hubTabHref('mine') },
    { key: 'waiting', label: '상대 대기', href: hubTabHref('waiting') },
    { key: 'disputed', label: '이의 처리', href: hubTabHref('disputed') },
]

/** URL의 ?tab= 값 → 탭 키. 미지의 값·미지정은 기본 탭(mine)으로 떨어진다 */
export function resolveHubTab(raw?: string): HubTab {
    return HUB_TABS.some((t) => t.key === raw) ? (raw as HubTab) : 'mine'
}

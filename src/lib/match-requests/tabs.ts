/**
 * 확인 요청 허브 4탭 — 승인 요청 / 경기 확정 대기 / 상대 승인 대기 / 이의 처리.
 * 네 탭은 **상호배타**다: 미확정 행 하나는 정확히 한 탭에만 나온다(분류는 queue.ts classifyPendingMatch).
 *
 * 탭이 가르는 축은 둘이다 — **차례**(내가 할 일인가 / 상대를 기다리는가)와 그중 **무엇을 하는가**:
 *  · 승인 요청      내가 **승인**할 것 — 참여 수락, 제안된 결과 확인
 *  · 경기 확정 대기  내가 **채워 넣어야** 확정되는 것 — 결과 입력, 참가자 채우기
 *  · 상대 승인 대기  공이 상대에게 넘어간 것 (사이드바 뱃지에서 빠진다)
 *  · 이의 처리      이의를 거친 협상의 생애 전체
 *
 * 앞의 셋 중 '승인 요청'과 '경기 확정 대기'가 내 차례이고, 사이드바 뱃지(myTurnTotal)는
 * **그 둘 + 이의 탭의 내 차례 둘**을 더한 값이다(lib/match-requests/hub-totals.ts).
 *
 * 라벨이 '이의 제기'가 아니라 '이의 처리'인 이유(0062): 이 탭은 disputed 상태만이 아니라 **이의를 거친
 * 협상의 생애 전체**를 확정될 때까지 담는다. 키는 `mine`·`waiting`·`disputed`로 유지해 기존 링크를
 * 보존한다(라벨만 바뀌었다). 매칭 리스트의 lib/match-rooms/tabs.ts와 같은 관용구다.
 */

export type HubTab = 'mine' | 'settle' | 'waiting' | 'disputed'

/** 기본 탭은 `?tab=`을 붙이지 않아 `/me/match-requests`가 정규 주소로 남는다 */
export function hubTabHref(tab: HubTab): string {
    return tab === 'mine' ? '/me/match-requests' : `/me/match-requests?tab=${tab}`
}

export const HUB_TABS: { key: HubTab; label: string; href: string }[] = [
    { key: 'mine', label: '승인 요청', href: hubTabHref('mine') },
    { key: 'settle', label: '경기 확정 대기', href: hubTabHref('settle') },
    { key: 'waiting', label: '상대 승인 대기', href: hubTabHref('waiting') },
    { key: 'disputed', label: '이의 처리', href: hubTabHref('disputed') },
]

/** URL의 ?tab= 값 → 탭 키. 미지의 값·미지정은 기본 탭(mine)으로 떨어진다 */
export function resolveHubTab(raw?: string): HubTab {
    return HUB_TABS.some((t) => t.key === raw) ? (raw as HubTab) : 'mine'
}

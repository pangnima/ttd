/**
 * 확인 요청 허브 2단 탭 — 「승인 요청」(하위: 초대 / 경기 결과 확정 / 이의 신청) · 「상대 승인 대기」.
 *
 * 최상위는 **차례 축** 하나로 가른다: 승인 요청 = 지금 내가 할 일, 상대 승인 대기 = 공이 상대에게 있는 것.
 * 승인 요청 안은 **생애 축**으로 다시 가른다:
 *  · 초대            참여 수락 — 받은 요청·로테이션 일정 초대·매칭 룸 초대
 *  · 경기 결과 확정  결과가 내 손을 기다린다 — 제안된 결과 확인(승인) / 결과 입력 / 참가자 채우기
 *  · 이의 신청       이의 뒤의 내 차례 — 재입력된 결과 확인 / 다시 입력할 차례
 * 미확정 행 하나는 정확히 한 자리에만 나온다(분류는 queue.ts classifyPendingMatch).
 *
 * 사이드바 뱃지(myTurnTotal)는 **승인 요청 탭의 내 차례** = 하위 세 탭의 내 차례 합이다(hub-totals.ts).
 *
 * 이의 **대기**(재입력 대기·재입력 결과 확인 대기)는 상대 승인 대기에 그린다 — 0062의 "이의를 거친 경기는
 * 확정까지 이의 탭에 머문다"를 여기서 철회했다. 이의자가 자기 분쟁을 추적하는 수단은 탭이 아니라 카드의
 * 배지(ReentryContextBadge·DisputeReasonLine)이고, 데이터(dispute_count·disputed_by·사유)는 그대로 남는다.
 *
 * 키는 평면 4개를 유지한다 — `?tab=`이 한 자리를 곧바로 가리켜야 저장 후 리다이렉트·배너 링크가 단순하다.
 * 옛 키(mine·settle·disputed)는 새 자리로 폴백해 기존 링크가 산다(매칭 리스트 tabs.ts의 upcoming→open 관용구).
 */

export type HubTab = 'invite' | 'result' | 'dispute' | 'waiting'
export type HubTopTab = 'mine' | 'waiting'

/** 기본 탭(초대)은 `?tab=`을 붙이지 않아 `/me/match-requests`가 정규 주소로 남는다 */
export function hubTabHref(tab: HubTab): string {
    return tab === 'invite' ? '/me/match-requests' : `/me/match-requests?tab=${tab}`
}

/** 승인 요청 안의 하위 탭 — 순서 = 경기의 생애 순서(참여 → 결과 → 이의) */
export const HUB_SUB_TABS: { key: HubTab; label: string; href: string }[] = [
    { key: 'invite', label: '초대', href: hubTabHref('invite') },
    { key: 'result', label: '경기 결과 확정', href: hubTabHref('result') },
    { key: 'dispute', label: '이의 신청', href: hubTabHref('dispute') },
]

/** 최상위 탭. 승인 요청의 href는 정적으로 첫 하위 탭이다 — 스마트 착지는 URL을 불안정하게 만든다 */
export const HUB_TOP_TABS: { key: HubTopTab; label: string; href: string }[] = [
    { key: 'mine', label: '승인 요청', href: hubTabHref('invite') },
    { key: 'waiting', label: '상대 승인 대기', href: hubTabHref('waiting') },
]

export function hubTopOf(tab: HubTab): HubTopTab {
    return tab === 'waiting' ? 'waiting' : 'mine'
}

const HUB_TAB_KEYS: readonly HubTab[] = ['invite', 'result', 'dispute', 'waiting']

/** 0064까지의 키 → 새 자리. mine은 승인 요청의 첫 하위 탭, settle은 결과 확정, disputed는 이의의 내 차례 */
const LEGACY_HUB_TABS: Record<string, HubTab> = { mine: 'invite', settle: 'result', disputed: 'dispute' }

/** URL의 ?tab= 값 → 탭 키. 옛 키는 새 자리로, 미지의 값·미지정은 기본 탭(invite)으로 떨어진다 */
export function resolveHubTab(raw?: string): HubTab {
    if (raw && (HUB_TAB_KEYS as readonly string[]).includes(raw)) return raw as HubTab
    return (raw && LEGACY_HUB_TABS[raw]) || 'invite'
}

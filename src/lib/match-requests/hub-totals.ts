import { HUB_SUB_TABS, type HubTab, type HubTopTab } from '@/lib/match-requests/tabs'
import {
    disputeMyTurnTotal, inviteMyTurn, resultMyTurn, type MatchQueueCounts,
} from '@/lib/match-requests/queue'

/**
 * 확인 요청 허브의 **목록 건수** — 탭 배지·섹션 헤더·빈 상태 판정의 단일 출처 (순수 모듈).
 *
 * `queue.ts`의 counts가 '지금 내가 할 일'(알림)이라면 이쪽은 '이 목록에 몇 장이 있나'(목차)다.
 * 종전에는 한 숫자가 두 의미를 겸해, 조건이 맞을 때마다 화면과 어긋났다:
 *  · 「이의 처리」 배지는 내 차례 2버킷만 세는데 패널은 4버킷·5섹션을 그려, 내가 이의를 제기하고
 *    상대의 재입력을 기다리는 동안 **배지 0인데 카드 N장**이었다.
 *  · 「결과 입력 대기」는 이미 게임이 등록된 세션을 카운트에서만 빼서 헤더 수 < 카드 수였고,
 *    그 값이 0이 되면 `QueueSection`의 0-게이트가 **카드까지 삼켜** 탭이 백지가 됐다.
 *
 * 그래서 규칙은 두 문장이다:
 *   1. 탭·섹션에 적히는 숫자는 **그 자리에 실제로 그려지는 카드 수**와 같다.
 *   2. '내 차례가 있다'는 신호는 숫자가 아니라 **강조(emphasis)** 가 전달한다.
 *
 * 2단 탭(Week 38)에서 허브는 승인 전용이라 승인 요청의 세 하위 탭은 카드 수 = 내 차례다.
 * 결과 입력 대기(enterResult·입력 가능한 세션)는 허브를 떠나 개인 경기 결과 목록에 있다.
 * 사이드바·모바일 뱃지는 여기가 아니라 `myTurnTotal`을 계속 쓴다.
 */

/**
 * 탭별 목록 건수. 접힌 이력(「종료된 요청」)은 세지 않는다 — 처리 대상이 아니고
 * 자기 헤더에 이미 `N건`을 달고 있다.
 *
 * waiting은 `counts.waiting`(요청 3섹션 + 결과 3섹션)에 이의 대기 둘을 더한다 — 이의 대기가 이 탭으로
 * 왔기 때문이다(Week 38). 패널이 배열 길이로 만드는 `waitingGroupTotals`와 같은 값이어야 한다(테스트 고정).
 */
export function hubTabTotals(c: MatchQueueCounts): Record<HubTab, number> {
    return {
        invite: c.participation,
        result: c.confirmResult + c.fillLineup,
        dispute: disputeMyTurnTotal(c),
        waiting: c.waiting + c.disputeWaiting + c.reentryWaiting,
    }
}

/** 탭별 '내 차례' 건수 — 배너 조각의 재료. 「상대 승인 대기」는 정의상 언제나 0이다 */
export function hubTabMyTurn(c: MatchQueueCounts): Record<HubTab, number> {
    return {
        invite: inviteMyTurn(c),
        result: resultMyTurn(c),
        dispute: disputeMyTurnTotal(c),
        waiting: 0,
    }
}

/** 탭별 '내 차례가 있는가' — 배지 강조의 근거 */
export function hubTabHasMyTurn(c: MatchQueueCounts): Record<HubTab, boolean> {
    const mine = hubTabMyTurn(c)
    return { invite: mine.invite > 0, result: mine.result > 0, dispute: mine.dispute > 0, waiting: false }
}

/** 내 차례가 있는 첫 하위 탭 — 배너 링크의 착지. 없으면 기본 탭 */
export function firstMyTurnTab(c: MatchQueueCounts): HubTab {
    const mine = hubTabMyTurn(c)
    return HUB_SUB_TABS.find((t) => mine[t.key] > 0)?.key ?? 'invite'
}

/** 최상위 탭 배지 — 승인 요청은 하위 세 탭의 합 */
export function hubTopTotals(c: MatchQueueCounts): Record<HubTopTab, number> {
    const t = hubTabTotals(c)
    return { mine: t.invite + t.result + t.dispute, waiting: t.waiting }
}

export function hubTopHasMyTurn(c: MatchQueueCounts): Record<HubTopTab, boolean> {
    const h = hubTabHasMyTurn(c)
    return { mine: h.invite || h.result || h.dispute, waiting: false }
}

/**
 * 「상대 승인 대기」 안 그룹의 건수 — 그룹 헤딩에 적힌다.
 *
 * 규칙: **각 탭은 그 탭이 가르지 않은 축으로 안에서 묶는다.** 이 탭은 차례로 갈린 자리라
 * 생애 축(참여 요청 / 경기 결과)으로 묶는다. 승인 요청의 하위 탭들은 이미 생애 축으로 갈려 있고
 * 각각 1~3섹션이라 그룹을 두지 않는다.
 *
 * counts만으로는 `waiting`이 두 축에 걸쳐 있어 나눌 수 없다(A축 3종은 배열 길이, B축은 tallied.waiting).
 * 그래서 패널이 자기가 그리는 배열 길이를 넘긴다 — 숫자와 카드가 같은 값에서 나오게 하려는 것이다.
 */
export type HubGroupTotals = { request: number; result: number }

export function waitingGroupTotals(parts: {
    sentRequests: number; awaitingMembers: number; awaitingSeats: number
    myConfirmed: number; awaitingOwner: number; repWaiting: number
    awaitingReentry: number; awaitingReentryConfirm: number
}): HubGroupTotals {
    return {
        request: parts.sentRequests + parts.awaitingMembers + parts.awaitingSeats,
        result: parts.myConfirmed + parts.awaitingOwner + parts.repWaiting
            + parts.awaitingReentry + parts.awaitingReentryConfirm,
    }
}

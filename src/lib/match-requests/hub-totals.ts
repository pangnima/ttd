import type { HubTab } from '@/lib/match-requests/tabs'
import {
    disputeMyTurnTotal, disputeTotal, mineTabMyTurn, settleTabMyTurn, type MatchQueueCounts,
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
 * 사이드바·모바일 뱃지는 여기가 아니라 `myTurnTotal`을 계속 쓴다 — 알림의 성질이라
 * 남을 기다리는 항목까지 세면 안 된다.
 */

/**
 * 「결과 입력 대기」 섹션에 그려지는 카드 수.
 *
 * 미확정 행(enterResult 버킷) + **로테이션 세션 카드 전량**이다. 세션 카드는 이미 게임을 넣었어도
 * 계속 보인다 — 참가자가 게임을 더 넣을 수 있어 빈 상태로 덮으면 안 된다(0050·0064).
 * 그 '이미 넣은' 몫이 `enteredSessions`이고, 내 차례에서는 빠지지만 목록에서는 빠지지 않는다.
 */
export function enterResultCards(c: MatchQueueCounts): number {
    return c.enterResult + c.enteredSessions
}

/** 「승인 요청」 탭에 그려지는 카드 수 — 참여 확인 + 결과 확인 대기 */
export function mineTabTotal(c: MatchQueueCounts): number {
    return c.participation + c.confirmResult
}

/**
 * 「경기 확정 대기」 탭에 그려지는 카드 수 — 결과 입력 대기 + 참가자 채우기.
 * 결과 입력 대기는 미확정 행뿐 아니라 로테이션 세션 카드까지 포함한다(enterResultCards).
 */
export function settleTabTotal(c: MatchQueueCounts): number {
    return enterResultCards(c) + c.fillLineup
}

/**
 * 탭별 목록 건수. 접힌 이력(「종료된 요청」)은 세지 않는다 — 처리 대상이 아니고
 * 자기 헤더에 이미 `N건`을 달고 있다.
 *
 * waiting은 `counts.waiting`이 이미 그 탭의 6섹션 합과 같다(요청 3 + 결과 3).
 * disputed는 `disputeTotal`이 4버킷 = 5섹션 합이다(같은 버킷을 이의자 여부로 둘로 나눠 그린다).
 */
export function hubTabTotals(c: MatchQueueCounts): Record<HubTab, number> {
    return {
        mine: mineTabTotal(c),
        settle: settleTabTotal(c),
        waiting: c.waiting,
        disputed: disputeTotal(c),
    }
}

/**
 * 탭별 '내 차례가 있는가' — 배지 강조의 근거.
 * 「상대 대기」는 정의상 공이 상대에게 있으므로 언제나 false다.
 */
export function hubTabHasMyTurn(c: MatchQueueCounts): Record<HubTab, boolean> {
    return {
        mine: mineTabMyTurn(c) > 0,
        settle: settleTabMyTurn(c) > 0,
        waiting: false,
        disputed: disputeMyTurnTotal(c) > 0,
    }
}

/**
 * 탭 안 그룹의 건수 — 그룹 헤딩에 적힌다.
 *
 * 규칙: **각 탭은 그 탭이 가르지 않은 축으로 안에서 묶는다.**
 * 「상대 승인 대기」는 차례로 갈린 자리라 생애 축(참여 요청 / 경기 결과)으로,
 * 「이의 처리」는 전부 결과 축이라 차례 축(지금 처리할 것 / 응답 대기 중)으로 묶는다.
 * 「승인 요청」·「경기 확정 대기」는 각각 2섹션뿐이고 성격이 이미 하나라 그룹을 두지 않는다 —
 * 섹션 제목이 곧 그룹 이름이 되어 헤딩이 중복될 뿐이다.
 */
export type HubGroupTotals = { request: number; result: number }

/**
 * 「상대 대기」 — 참여 요청 3섹션 / 경기 결과 3섹션.
 * counts만으로는 `waiting`이 두 축에 걸쳐 있어 나눌 수 없다(A축 3종은 배열 길이, B축은 tallied.waiting).
 * 그래서 패널이 자기가 그리는 배열 길이를 넘긴다 — 숫자와 카드가 같은 값에서 나오게 하려는 것이다.
 */
export function waitingGroupTotals(parts: {
    myConfirmed: number; repWaiting: number
    sentRequests: number; awaitingMembers: number; awaitingSeats: number; awaitingOwner: number
}): HubGroupTotals {
    return {
        request: parts.sentRequests + parts.awaitingMembers + parts.awaitingSeats,
        result: parts.myConfirmed + parts.awaitingOwner + parts.repWaiting,
    }
}

/** 「이의 처리」 — 지금 처리할 것 2섹션 / 응답 대기 중 3섹션 */
export function disputedGroupTotals(c: MatchQueueCounts): { myTurn: number; waiting: number } {
    return { myTurn: disputeMyTurnTotal(c), waiting: c.disputeWaiting + c.reentryWaiting }
}

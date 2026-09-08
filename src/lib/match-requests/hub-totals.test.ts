import { describe, expect, it } from 'vitest'
import { EMPTY_QUEUE_COUNTS, myTurnTotal, type MatchQueueCounts } from '@/lib/match-requests/queue'
import {
    disputedGroupTotals, enterResultCards, hubTabHasMyTurn, hubTabTotals,
    settleTabTotal, waitingGroupTotals,
} from '@/lib/match-requests/hub-totals'

const c = (over: Partial<MatchQueueCounts> = {}): MatchQueueCounts => ({ ...EMPTY_QUEUE_COUNTS, ...over })

describe('enterResultCards — 「결과 입력 대기」에 그려지는 카드 수', () => {
    it('미확정 행 + 로테이션 세션 카드 전량', () => {
        expect(enterResultCards(c({ enterResult: 2, enteredSessions: 3 }))).toBe(5)
    })

    it('⚠ 회귀: 내 차례가 0이어도 이미 등록된 세션이 있으면 카드가 있다', () => {
        // 이 값이 0으로 떨어지면 QueueSection의 0-게이트가 세션 카드까지 삼켜
        // 그 탭이 배지·카드·빈 상태 문구 없는 백지가 된다(0064까지의 실제 결함).
        const counts = c({ enterResult: 0, enteredSessions: 2 })
        expect(enterResultCards(counts)).toBe(2)
        expect(settleTabTotal(counts)).toBe(2)
        expect(hubTabTotals(counts).settle).toBe(2)
    })
})

describe('hubTabTotals — 탭 배지는 그 탭의 카드 수와 같다', () => {
    it('승인 요청 = 참여 확인 + 결과 확인 (내가 승인할 것만)', () => {
        const counts = c({ participation: 1, confirmResult: 2, enterResult: 3, fillLineup: 4, enteredSessions: 5 })
        expect(hubTabTotals(counts).mine).toBe(3)
    })

    it('경기 확정 대기 = 결과 입력(세션 포함) + 참가자 채우기 (내가 채워 넣을 것만)', () => {
        const counts = c({ participation: 1, confirmResult: 2, enterResult: 3, fillLineup: 4, enteredSessions: 5 })
        expect(hubTabTotals(counts).settle).toBe(12)
    })

    it('두 내 차례 탭이 종전 「내 차례」 한 탭의 합과 같다 — 총량은 그대로, 라우팅만 갈렸다', () => {
        const counts = c({ participation: 1, confirmResult: 2, enterResult: 3, fillLineup: 4, enteredSessions: 5 })
        expect(hubTabTotals(counts).mine + hubTabTotals(counts).settle).toBe(15)
    })

    it('상대 대기 = counts.waiting (이미 6섹션 합과 같다)', () => {
        expect(hubTabTotals(c({ waiting: 6 })).waiting).toBe(6)
    })

    it('이의 처리 = 네 버킷 전부 — 내 차례 둘만 세던 종전과 다르다', () => {
        const counts = c({ reenterResult: 1, reentryReview: 2, disputeWaiting: 3, reentryWaiting: 4 })
        expect(hubTabTotals(counts).disputed).toBe(10)
    })

    it('⚠ 회귀: 대기 항목만 있어도 이의 탭 배지가 사라지지 않는다', () => {
        // 내가 이의를 제기하고 상대의 재입력을 기다리는 동안 배지가 0이 되어(LinkTabs가 0을 숨긴다)
        // 카드는 보이는데 숫자만 없는 상태였다.
        const counts = c({ disputeWaiting: 3 })
        expect(hubTabTotals(counts).disputed).toBe(3)
        expect(hubTabHasMyTurn(counts).disputed).toBe(false)
    })

    it('빈 큐는 네 탭 모두 0', () => {
        expect(hubTabTotals(EMPTY_QUEUE_COUNTS)).toEqual({ mine: 0, settle: 0, waiting: 0, disputed: 0 })
    })
})

describe('hubTabHasMyTurn — 강조는 숫자와 별개다', () => {
    it('상대 대기는 정의상 언제나 false', () => {
        expect(hubTabHasMyTurn(c({ waiting: 99 })).waiting).toBe(false)
    })

    it('승인 요청은 참여 확인·결과 확인 중 하나라도 있으면 true', () => {
        expect(hubTabHasMyTurn(c({ participation: 1 })).mine).toBe(true)
        expect(hubTabHasMyTurn(c({ confirmResult: 1 })).mine).toBe(true)
        expect(hubTabHasMyTurn(c({ fillLineup: 1 })).mine).toBe(false)
    })

    it('경기 확정 대기는 입력·라인업 중 하나라도 있으면 true — 등록만 된 세션은 내 차례가 아니다', () => {
        expect(hubTabHasMyTurn(c({ enterResult: 1 })).settle).toBe(true)
        expect(hubTabHasMyTurn(c({ fillLineup: 1 })).settle).toBe(true)
        expect(hubTabHasMyTurn(c({ enteredSessions: 9 })).settle).toBe(false)
    })

    it('이의 탭은 내 차례 둘 중 하나라도 있으면 true', () => {
        expect(hubTabHasMyTurn(c({ reenterResult: 1 })).disputed).toBe(true)
        expect(hubTabHasMyTurn(c({ reentryReview: 1 })).disputed).toBe(true)
        expect(hubTabHasMyTurn(c({ reentryWaiting: 9 })).disputed).toBe(false)
    })

    it('강조가 켜지면 사이드바 뱃지도 0이 아니다 — 두 신호가 모순되지 않는다', () => {
        const counts = c({ reentryReview: 2 })
        expect(hubTabHasMyTurn(counts).disputed).toBe(true)
        expect(myTurnTotal(counts)).toBeGreaterThan(0)
    })
})

describe('그룹 건수 — 합이 탭 총합과 같다', () => {
    it('상대 대기: 참여 3섹션 / 결과 3섹션으로 갈린다', () => {
        const g = waitingGroupTotals({
            myConfirmed: 1, repWaiting: 2, sentRequests: 3, awaitingMembers: 4, awaitingSeats: 5, awaitingOwner: 6,
        })
        expect(g).toEqual({ request: 12, result: 9 })
    })

    it('이의 처리: 지금 처리할 것 + 응답 대기 중 = 탭 총합', () => {
        const counts = c({ reenterResult: 1, reentryReview: 2, disputeWaiting: 3, reentryWaiting: 4 })
        const g = disputedGroupTotals(counts)
        expect(g).toEqual({ myTurn: 3, waiting: 7 })
        expect(g.myTurn + g.waiting).toBe(hubTabTotals(counts).disputed)
    })
})

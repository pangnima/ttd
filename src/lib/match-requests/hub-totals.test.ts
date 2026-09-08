import { describe, expect, it } from 'vitest'
import { EMPTY_QUEUE_COUNTS, myTurnTotal, type MatchQueueCounts } from '@/lib/match-requests/queue'
import {
    firstMyTurnTab, hubTabHasMyTurn, hubTabMyTurn, hubTabTotals,
    hubTopHasMyTurn, hubTopTotals, waitingGroupTotals,
} from '@/lib/match-requests/hub-totals'

const c = (over: Partial<MatchQueueCounts> = {}): MatchQueueCounts => ({ ...EMPTY_QUEUE_COUNTS, ...over })

describe('hubTabTotals — 탭 배지는 그 탭의 카드 수와 같다', () => {
    const counts = c({
        participation: 1, confirmResult: 2, enterResult: 3, fillLineup: 4,
        waiting: 6, reenterResult: 7, reentryReview: 8, disputeWaiting: 9, reentryWaiting: 10,
    })

    it('초대 = 참여 확인', () => {
        expect(hubTabTotals(counts).invite).toBe(1)
    })

    it('경기 결과 확정 = 결과 확인 + 참가자 채우기 — 결과 입력(enterResult)은 허브 밖이다(Week 38)', () => {
        expect(hubTabTotals(counts).result).toBe(2 + 4)
    })

    it('이의 신청 = 내 차례 둘만 — 카드 수가 곧 내 차례다', () => {
        expect(hubTabTotals(counts).dispute).toBe(15)
    })

    it('상대 승인 대기 = counts.waiting + 이의 대기 둘 (이의 대기가 이 탭으로 왔다, Week 38)', () => {
        expect(hubTabTotals(counts).waiting).toBe(6 + 9 + 10)
    })

    it('빈 큐는 네 자리 모두 0', () => {
        expect(hubTabTotals(EMPTY_QUEUE_COUNTS)).toEqual({ invite: 0, result: 0, dispute: 0, waiting: 0 })
    })
})

describe('hubTabMyTurn / hubTabHasMyTurn — 강조는 숫자와 별개다', () => {
    it('상대 승인 대기는 정의상 언제나 0·false', () => {
        expect(hubTabMyTurn(c({ waiting: 99, disputeWaiting: 3 })).waiting).toBe(0)
        expect(hubTabHasMyTurn(c({ waiting: 99 })).waiting).toBe(false)
    })

    it('경기 결과 확정은 확인·라인업 중 하나라도 있으면 true — 결과 입력 대기는 허브의 내 차례가 아니다', () => {
        expect(hubTabHasMyTurn(c({ confirmResult: 1 })).result).toBe(true)
        expect(hubTabHasMyTurn(c({ fillLineup: 1 })).result).toBe(true)
        expect(hubTabHasMyTurn(c({ enterResult: 9 })).result).toBe(false)
    })

    it('이의 신청은 내 차례 둘 중 하나라도 있으면 true — 이의 대기만으로는 아니다', () => {
        expect(hubTabHasMyTurn(c({ reenterResult: 1 })).dispute).toBe(true)
        expect(hubTabHasMyTurn(c({ reentryReview: 1 })).dispute).toBe(true)
        expect(hubTabHasMyTurn(c({ reentryWaiting: 9, disputeWaiting: 9 })).dispute).toBe(false)
    })

    it('사이드바 뱃지 = 하위 세 탭의 내 차례 합 (알림의 항등식)', () => {
        const counts = c({
            participation: 1, confirmResult: 2, enterResult: 3, fillLineup: 4,
            reenterResult: 5, reentryReview: 6,
        })
        const mine = hubTabMyTurn(counts)
        expect(mine.invite + mine.result + mine.dispute).toBe(myTurnTotal(counts))
        expect(myTurnTotal(counts)).toBe(18)
    })
})

describe('hubTopTotals / hubTopHasMyTurn — 최상위 배지는 하위 합', () => {
    it('승인 요청 = 초대 + 경기 결과 확정 + 이의 신청', () => {
        const counts = c({ participation: 1, confirmResult: 2, fillLineup: 3, reentryReview: 4, waiting: 5 })
        const t = hubTabTotals(counts)
        expect(hubTopTotals(counts)).toEqual({ mine: t.invite + t.result + t.dispute, waiting: 5 })
    })

    it('승인 요청 강조 = 하위 셋 중 하나라도 내 차례', () => {
        expect(hubTopHasMyTurn(c({ reentryReview: 1 })).mine).toBe(true)
        expect(hubTopHasMyTurn(c({ enterResult: 5 })).mine).toBe(false)
        expect(hubTopHasMyTurn(c({ waiting: 5, disputeWaiting: 2 })).waiting).toBe(false)
    })
})

describe('firstMyTurnTab — 배너 링크의 착지', () => {
    it('생애 순서로 첫 내 차례 탭', () => {
        expect(firstMyTurnTab(c({ participation: 1, reentryReview: 1 }))).toBe('invite')
        expect(firstMyTurnTab(c({ confirmResult: 1, reenterResult: 1 }))).toBe('result')
        expect(firstMyTurnTab(c({ reenterResult: 1 }))).toBe('dispute')
    })

    it('내 차례가 없으면 기본 탭', () => {
        expect(firstMyTurnTab(c({ enterResult: 3, waiting: 9 }))).toBe('invite')
    })
})

describe('waitingGroupTotals — 패널의 배열 길이와 탭 배지가 같은 값이어야 한다', () => {
    const parts = {
        sentRequests: 1, awaitingMembers: 2, awaitingSeats: 3,
        myConfirmed: 4, awaitingOwner: 5, repWaiting: 6, awaitingReentry: 7, awaitingReentryConfirm: 8,
    }

    it('참여 요청 3섹션 / 경기 결과 5섹션(이의 대기 둘 포함)', () => {
        expect(waitingGroupTotals(parts)).toEqual({ request: 6, result: 30 })
    })

    it('두 출처 일치 — 그룹 합 = hubTabTotals(c).waiting', () => {
        // counts.waiting = tallied.waiting(myConfirmed + repWaiting) + sentRequests + awaitingMembers
        //                  + awaitingOwner + awaitingSeats (match-queue.ts 조립)
        const counts = c({ waiting: 1 + 2 + 3 + 4 + 5 + 6, disputeWaiting: 7, reentryWaiting: 8 })
        const g = waitingGroupTotals(parts)
        expect(g.request + g.result).toBe(hubTabTotals(counts).waiting)
    })
})

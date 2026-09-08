import { describe, expect, it } from 'vitest'
import type { MatchResultStatus, PersonalMatch, PersonalMatchConfirmation } from '@/types'
import {
    EMPTY_QUEUE_COUNTS, classifyPendingMatch, disputeMyTurnTotal, disputeTotal, myTurnTotal, tallyBuckets,
} from './queue'

/**
 * 상태 조합 전량 고정 — redesign-fixtures/match-requests.ts가 갖고 있던
 * "어떤 상태 조합이 존재하는가"라는 지식을 픽스처 삭제 전에 테스트로 옮겨 둔다.
 */

// 모든 케이스는 미확정(setScores 빈 배열)이 전제다 — 확정 행은 개인 경기 결과 화면 소관
function base(over: Partial<PersonalMatch> = {}): PersonalMatch {
    return {
        id: 'm1',
        userId: 'me',
        opponentName: '상대',
        playedAt: '2026-09-01',
        matchType: 'singles',
        setScores: [],
        createdAt: '2026-09-01T00:00:00Z',
        ...over,
    }
}

function conf(
    status: MatchResultStatus, proposedByMe = false, confirmedByMe = proposedByMe, disputeRound = 0,
): PersonalMatchConfirmation {
    return {
        requestId: 'r1', status, proposedByMe, confirmedByMe, disputedByMe: false, disputeRound,
        confirmProgress: { confirmed: confirmedByMe ? 2 : 1, total: 4 },
        proposedSets: [], viewerIsParty: true,
    }
}

describe('classifyPendingMatch — 자유 기록', () => {
    it('라인업이 차 있으면 내가 바로 입력한다', () => {
        expect(classifyPendingMatch(base())).toBe('enterResult')
    })

    it('상대 이름이 비었으면 참가자를 채워야 한다 (방 소속이 아니어도)', () => {
        expect(classifyPendingMatch(base({ opponentName: '' }))).toBe('fillLineup')
    })

    it('복식은 파트너·상대2까지 있어야 입력 가능', () => {
        const doubles = base({ matchType: 'men_doubles', partnerName: '파트너', opponent2Name: '상대2' })
        expect(classifyPendingMatch(doubles)).toBe('enterResult')
        expect(classifyPendingMatch({ ...doubles, opponent2Name: undefined })).toBe('fillLineup')
        expect(classifyPendingMatch({ ...doubles, partnerName: undefined })).toBe('fillLineup')
    })
})

describe('classifyPendingMatch — 모집 중', () => {
    it('방에 노출됐고 참가자가 비었으면 모집 중이 우선한다', () => {
        expect(classifyPendingMatch(base({ roomId: 'room1', opponentName: '' }))).toBe('fillLineup')
    })

    it('방 소속이어도 라인업이 차 있으면 모집 중이 아니다', () => {
        expect(classifyPendingMatch(base({ roomId: 'room1' }))).toBe('enterResult')
    })
})

describe('classifyPendingMatch — 상호 확인 경기', () => {
    const mutual = (c?: PersonalMatchConfirmation) =>
        base({ sourceRequestId: 'r1', sourceType: 'confirmation', confirmation: c })

    it('none — 아무도 제안하지 않았으니 내 차례', () => {
        expect(classifyPendingMatch(mutual(conf('none')))).toBe('enterResult')
    })

    it('disputed & 내 제안 — 이의 탭 · 다시 입력할 차례 (0061)', () => {
        expect(classifyPendingMatch(mutual(conf('disputed', true, false)))).toBe('reenterResult')
    })

    it('disputed & 내가 이의 제기 — 이의 탭 · 재입력 대기', () => {
        expect(classifyPendingMatch(mutual({ ...conf('disputed'), disputedByMe: true, disputedBy: 'me' }))).toBe('awaitingReentry')
    })

    it('disputed & 제안자도 이의자도 아닌 좌석(복식 파트너) — 재입력 대기', () => {
        expect(classifyPendingMatch(mutual({ ...conf('disputed'), disputedBy: 'other' }))).toBe('awaitingReentry')
    })

    it('disputed & 제안자 본인이 정정(reopen) — 그래도 제안자 차례 (disputedByMe는 차례 판정에 쓰지 않는다)', () => {
        expect(classifyPendingMatch(mutual({ ...conf('disputed', true, false), disputedByMe: true, disputedBy: 'me' }))).toBe('reenterResult')
    })

    it('disputed & 좌석 판정 실패 폴백 — 상대 대기가 아니라 이의 탭 (3탭 상호배타)', () => {
        expect(classifyPendingMatch(mutual({ ...conf('disputed'), viewerIsParty: false }))).toBe('awaitingReentry')
        expect(classifyPendingMatch(mutual({ ...conf('disputed', true, false), viewerIsParty: false }))).toBe('awaitingReentry')
    })

    it('disputed라도 모집 중이 먼저다', () => {
        expect(classifyPendingMatch(base({
            sourceRequestId: 'r1', roomId: 'room1', opponentName: '', confirmation: conf('disputed', true, false),
        }))).toBe('fillLineup')
    })

    it('proposed & 상대 제안 — 내가 확인해야 한다', () => {
        expect(classifyPendingMatch(mutual(conf('proposed', false)))).toBe('confirmResult')
    })

    it('proposed & 내 제안 — 남은 좌석을 기다린다', () => {
        expect(classifyPendingMatch(mutual(conf('proposed', true)))).toBe('awaitingCounterpart')
    })

    it('proposed & 내가 이미 확인 — 남은 좌석을 기다린다 (0060 만장일치)', () => {
        expect(classifyPendingMatch(mutual(conf('proposed', false, true)))).toBe('awaitingCounterpart')
    })

    it('협상을 못 읽는 관점 복사본(좌석 판정 실패 폴백)은 남은 좌석을 기다린다', () => {
        expect(classifyPendingMatch(mutual(undefined))).toBe('awaitingCounterpart')
    })

    it('협상을 읽더라도 좌석이 아니면 남은 좌석을 기다린다', () => {
        const notParty = { ...conf('none'), viewerIsParty: false }
        expect(classifyPendingMatch(mutual(notParty))).toBe('awaitingCounterpart')
        const proposedByRep = { ...conf('proposed', false), viewerIsParty: false }
        expect(classifyPendingMatch(mutual(proposedByRep))).toBe('awaitingCounterpart')
    })

    it('confirmed인데 세트가 없는 조합은 방어적으로 대기 처리', () => {
        expect(classifyPendingMatch(mutual(conf('confirmed')))).toBe('awaitingCounterpart')
    })

    it('상호 확인 경기라도 모집 중이 먼저다', () => {
        expect(classifyPendingMatch(base({
            sourceRequestId: 'r1', roomId: 'room1', opponentName: '', confirmation: conf('none'),
        }))).toBe('fillLineup')
    })
})

describe('classifyPendingMatch — 이의를 거친 뒤 재제안 (0062)', () => {
    const mutual = (c?: PersonalMatchConfirmation) =>
        base({ sourceRequestId: 'r1', sourceType: 'confirmation', confirmation: c })

    it('상대가 다시 입력했고 내가 아직 확인하지 않았다 — 이의 탭 · 재입력된 결과 확인', () => {
        expect(classifyPendingMatch(mutual(conf('proposed', false, false, 1)))).toBe('reentryReview')
    })

    it('이의를 낸 사람도 같은 버킷이다 — 자기가 시작한 분쟁을 여기서 끝낸다', () => {
        const disputer = { ...conf('proposed', false, false, 1), disputedByMe: true, disputedBy: 'me' }
        expect(classifyPendingMatch(mutual(disputer))).toBe('reentryReview')
    })

    it('내가 다시 입력한 쪽이면 남은 좌석을 기다린다 — 상대 대기 탭이 아니라 이의 탭에서', () => {
        expect(classifyPendingMatch(mutual(conf('proposed', true, true, 1)))).toBe('awaitingReentryConfirm')
    })

    it('재입력된 결과를 내가 이미 확인했으면 이의 탭에서 대기', () => {
        expect(classifyPendingMatch(mutual(conf('proposed', false, true, 1)))).toBe('awaitingReentryConfirm')
    })

    it('좌석 판정 실패 폴백도 이의 탭에 남는다 — 판정이 viewerIsParty보다 앞이라 상호배타가 유지된다', () => {
        const notParty = { ...conf('proposed', false, false, 2), viewerIsParty: false }
        expect(classifyPendingMatch(mutual(notParty))).toBe('awaitingReentryConfirm')
    })

    it('이의 이력이 없으면 종전대로 내 차례 탭이다 — 0062가 기존 흐름을 건드리지 않는다', () => {
        expect(classifyPendingMatch(mutual(conf('proposed', false, false, 0)))).toBe('confirmResult')
        expect(classifyPendingMatch(mutual(conf('proposed', true, true, 0)))).toBe('awaitingCounterpart')
    })

    it('다시 이의가 들어오면 disputed 분기가 먼저다 — 왕복해도 같은 탭', () => {
        expect(classifyPendingMatch(mutual(conf('disputed', true, false, 2)))).toBe('reenterResult')
        expect(classifyPendingMatch(mutual(conf('disputed', false, false, 2)))).toBe('awaitingReentry')
    })

    it('이의 이력이 있어도 모집 중·none이 각자 자기 자리로 간다', () => {
        expect(classifyPendingMatch(base({
            sourceRequestId: 'r1', roomId: 'room1', opponentName: '', confirmation: conf('proposed', false, false, 1),
        }))).toBe('fillLineup')
        expect(classifyPendingMatch(mutual(conf('none', false, false, 1)))).toBe('enterResult')
    })
})

describe('tallyBuckets', () => {
    it('버킷별로 집계하고 대기 계열을 waiting/disputeWaiting/reentryWaiting으로 접는다', () => {
        expect(tallyBuckets([
            'confirmResult', 'enterResult', 'enterResult', 'fillLineup',
            'awaitingCounterpart', 'awaitingCounterpart',
            'reenterResult', 'awaitingReentry', 'awaitingReentry', 'awaitingReentry',
            'reentryReview', 'reentryReview', 'awaitingReentryConfirm',
        ])).toEqual({
            confirmResult: 1, enterResult: 2, fillLineup: 1, waiting: 2,
            reenterResult: 1, disputeWaiting: 3, reentryReview: 2, reentryWaiting: 1,
        })
    })

    it('빈 목록은 전부 0', () => {
        expect(tallyBuckets([])).toEqual({
            confirmResult: 0, enterResult: 0, fillLineup: 0, waiting: 0,
            reenterResult: 0, disputeWaiting: 0, reentryReview: 0, reentryWaiting: 0,
        })
    })
})

describe('myTurnTotal / disputeTotal / disputeMyTurnTotal', () => {
    const counts = {
        participation: 2, confirmResult: 1, enterResult: 3, fillLineup: 1, waiting: 99,
        reenterResult: 2, disputeWaiting: 5, reentryReview: 4, reentryWaiting: 6,
    }

    it('뱃지 = 내 차례 네 섹션 + 이의 탭의 내 차례 둘. 상대 대기·이의 대기는 뺀다', () => {
        expect(myTurnTotal(counts)).toBe(13)
    })

    it('이의 탭 총건수 = 네 버킷 전부', () => {
        expect(disputeTotal(counts)).toBe(17)
    })

    it('이의 탭 배지 = 다시 입력할 차례 + 재입력된 결과 확인', () => {
        expect(disputeMyTurnTotal(counts)).toBe(6)
    })

    it('뱃지 = 내 차례 탭 배지 + 이의 탭 배지 — 탭 배지 두 개를 더하면 사이드바와 같다', () => {
        const mineTab = myTurnTotal(counts) - disputeMyTurnTotal(counts)
        expect(mineTab).toBe(7)
        expect(mineTab + disputeMyTurnTotal(counts)).toBe(myTurnTotal(counts))
    })

    it('빈 큐는 0 — 배너·뱃지가 렌더되지 않는 조건', () => {
        expect(myTurnTotal(EMPTY_QUEUE_COUNTS)).toBe(0)
        expect(disputeTotal(EMPTY_QUEUE_COUNTS)).toBe(0)
        expect(disputeMyTurnTotal(EMPTY_QUEUE_COUNTS)).toBe(0)
    })
})

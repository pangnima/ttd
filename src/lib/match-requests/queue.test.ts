import { describe, expect, it } from 'vitest'
import type { MatchResultStatus, PersonalMatch, PersonalMatchConfirmation } from '@/types'
import {
    EMPTY_QUEUE_COUNTS, classifyPendingMatch, myTurnTotal, tallyBuckets,
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

function conf(status: MatchResultStatus, proposedByMe = false): PersonalMatchConfirmation {
    return { requestId: 'r1', status, proposedByMe, proposedSets: [], viewerIsParty: true }
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

    it('disputed — 이의로 되돌아왔으니 다시 제안할 차례', () => {
        expect(classifyPendingMatch(mutual(conf('disputed')))).toBe('enterResult')
    })

    it('proposed & 상대 제안 — 내가 확인해야 한다', () => {
        expect(classifyPendingMatch(mutual(conf('proposed', false)))).toBe('confirmResult')
    })

    it('proposed & 내 제안 — 상대를 기다린다', () => {
        expect(classifyPendingMatch(mutual(conf('proposed', true)))).toBe('awaitingCounterpart')
    })

    it('협상을 못 읽는 관점 복사본(복식 파트너·상대2)은 대표를 기다린다', () => {
        expect(classifyPendingMatch(mutual(undefined))).toBe('awaitingCounterpart')
    })

    it('협상을 읽더라도 당사자가 아니면(파트너·상대2, 0052 이후) 대표를 기다린다', () => {
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

describe('tallyBuckets', () => {
    it('버킷별로 집계하고 awaitingCounterpart는 waiting으로 접는다', () => {
        expect(tallyBuckets([
            'confirmResult', 'enterResult', 'enterResult', 'fillLineup',
            'awaitingCounterpart', 'awaitingCounterpart',
        ])).toEqual({ confirmResult: 1, enterResult: 2, fillLineup: 1, waiting: 2 })
    })

    it('빈 목록은 전부 0', () => {
        expect(tallyBuckets([])).toEqual({ confirmResult: 0, enterResult: 0, fillLineup: 0, waiting: 0 })
    })
})

describe('myTurnTotal', () => {
    it('내 차례 네 섹션만 합산하고 상대 대기는 뱃지에서 뺀다', () => {
        expect(myTurnTotal({
            participation: 2, confirmResult: 1, enterResult: 3, fillLineup: 1, waiting: 99,
        })).toBe(7)
    })

    it('빈 큐는 0 — 배너·뱃지가 렌더되지 않는 조건', () => {
        expect(myTurnTotal(EMPTY_QUEUE_COUNTS)).toBe(0)
    })
})

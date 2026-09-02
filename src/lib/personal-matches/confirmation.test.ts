import { describe, expect, it } from 'vitest'
import { buildConfirmation, type ConfirmationSourceRow } from './confirmation'
import { invertSetScores } from './perspective'

const REQ: ConfirmationSourceRow = {
    id: 'req-1',
    requester_id: 'alice',
    result_status: 'proposed',
    proposed_by: 'bob',
    proposed_set_scores: [{ me: 6, opp: 4 }, { me: 3, opp: 6 }],  // 요청자(alice) 관점
    dispute_reason: null,
}

describe('buildConfirmation', () => {
    it('요청자가 보면 제안 세트를 그대로, 상대가 보면 반전해서 준다', () => {
        const forAlice = buildConfirmation(REQ, 'alice')
        expect(forAlice.proposedSets).toEqual([{ me: 6, opp: 4 }, { me: 3, opp: 6 }])
        expect(forAlice.proposedByMe).toBe(false)

        const forBob = buildConfirmation(REQ, 'bob')
        expect(forBob.proposedSets).toEqual([{ me: 4, opp: 6 }, { me: 6, opp: 3 }])
        expect(forBob.proposedByMe).toBe(true)
        expect(forBob.status).toBe('proposed')
        expect(forBob.requestId).toBe('req-1')
    })

    it('이의 사유와 비배열 제안값을 안전하게 매핑', () => {
        const c = buildConfirmation(
            { ...REQ, result_status: 'disputed', dispute_reason: '2세트는 6-3', proposed_set_scores: null },
            'alice',
        )
        expect(c.status).toBe('disputed')
        expect(c.disputeReason).toBe('2세트는 6-3')
        expect(c.proposedSets).toEqual([])
    })
})

describe('invertSetScores', () => {
    it('두 번 반전하면 원본으로 돌아오고 순서를 보존한다', () => {
        const sets = [{ me: 6, opp: 4 }, { me: 3, opp: 6 }, { me: 7, opp: 5 }]
        expect(invertSetScores(invertSetScores(sets))).toEqual(sets)
        expect(invertSetScores(sets)[0]).toEqual({ me: 4, opp: 6 })
        expect(invertSetScores([])).toEqual([])
    })
})

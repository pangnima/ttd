import { describe, expect, it } from 'vitest'
import { buildConfirmation, bystanderWaitingBadge, type ConfirmationSourceRow } from './confirmation'
import { invertSetScores } from './perspective'

const REQ: ConfirmationSourceRow = {
    id: 'req-1',
    requester_id: 'alice',
    opponent_user_id: 'bob',
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

    it('요청 당사자(요청자·대표 확인자)만 viewerIsParty', () => {
        expect(buildConfirmation(REQ, 'alice').viewerIsParty).toBe(true)
        expect(buildConfirmation(REQ, 'bob').viewerIsParty).toBe(true)
        // 복식 파트너의 관점 행 — 협상 행을 읽어도 제안·확인 자격은 없다
        expect(buildConfirmation(REQ, 'carol').viewerIsParty).toBe(false)
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

describe('bystanderWaitingBadge', () => {
    // 파트너(carol) 관점 — 0052로 협상은 읽지만 viewerIsParty는 false다
    const forPartner = (row: Partial<ConfirmationSourceRow>) =>
        bystanderWaitingBadge(buildConfirmation({ ...REQ, ...row }, 'carol'))

    it('협상 행을 못 읽으면 종전 문구로 폴백한다', () => {
        expect(bystanderWaitingBadge(undefined).label).toBe('대표 확인 대기')
    })

    it('제안 전/후/이의를 문구로 구분한다', () => {
        expect(forPartner({ result_status: 'none', proposed_by: null }).label).toBe('결과 입력 대기')
        expect(forPartner({ result_status: 'proposed' }).label).toBe('대표 확인 대기')

        const disputed = forPartner({ result_status: 'disputed', dispute_reason: '2세트는 6-3' })
        expect(disputed.label).toBe('이의 제기됨')
        expect(disputed.title).toBe('2세트는 6-3')
    })

    it('confirmed인데 세트가 없는 불가능 조합은 폴백한다', () => {
        expect(forPartner({ result_status: 'confirmed' }).label).toBe('대표 확인 대기')
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

import { describe, expect, it } from 'vitest'
import {
    buildConfirmation, bystanderWaitingBadge, canReopenResult, canRespondToProposal, disputeBadge, disputerNameOf,
    formatConfirmProgress, hasDisputeHistory, isReentryTurn, reentryBadge,
    type ConfirmationSourceRow,
} from './confirmation'
import { invertSetScores } from './perspective'

const REQ: ConfirmationSourceRow = {
    id: 'req-1',
    requester_id: 'alice',
    opponent_user_id: 'bob',
    result_status: 'proposed',
    proposed_by: 'bob',
    proposed_set_scores: [{ me: 6, opp: 4 }, { me: 3, opp: 6 }],  // 요청자(alice) 관점
    dispute_reason: null,
    confirmed_by: ['bob'],  // 제안이 곧 제안자의 확인 (0060 트리거)
}

// 복식 좌석 넷을 갖춘 픽스처 — alice(요청자)·carol(파트너) vs bob(대표)·dave(상대2)
const DOUBLES: ConfirmationSourceRow = {
    ...REQ,
    participants: [{ role: 'partner', user_id: 'carol' }, { role: 'opponent2', user_id: 'dave' }],
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

    it('좌석 넷 전원이 viewerIsParty — 좌석 누구나 협상에 참여한다', () => {
        expect(buildConfirmation(DOUBLES, 'alice').viewerIsParty).toBe(true)   // 요청자
        expect(buildConfirmation(DOUBLES, 'carol').viewerIsParty).toBe(true)   // 내 파트너
        expect(buildConfirmation(DOUBLES, 'bob').viewerIsParty).toBe(true)     // 상대 대표
        expect(buildConfirmation(DOUBLES, 'dave').viewerIsParty).toBe(true)    // 상대2
        expect(buildConfirmation(DOUBLES, 'eve').viewerIsParty).toBe(false)    // 무관자
    })

    it('참가자를 부착하지 않으면 좌석을 못 찾아 권한이 **과소**로 무너진다(안전 설계)', () => {
        expect(buildConfirmation(REQ, 'carol').viewerIsParty).toBe(false)
    })

    it('제안자는 제안 시점에 확인한 것으로 센다 — confirmedByMe', () => {
        expect(buildConfirmation(DOUBLES, 'bob').confirmedByMe).toBe(true)
        expect(buildConfirmation(DOUBLES, 'dave').confirmedByMe).toBe(false)   // 제안자의 파트너도 아직이다
        expect(buildConfirmation(DOUBLES, 'alice').confirmedByMe).toBe(false)
    })

    it('진행도 — 분모는 user_id가 있는 좌석 수, 분자는 확인 배열 길이', () => {
        expect(buildConfirmation(DOUBLES, 'alice').confirmProgress).toEqual({ confirmed: 1, total: 4 })
        const two = { ...DOUBLES, confirmed_by: ['bob', 'carol'] }
        expect(buildConfirmation(two, 'alice').confirmProgress).toEqual({ confirmed: 2, total: 4 })
        // 비회원 슬롯(user_id null)은 분모에서 빠진다
        const guest = { ...DOUBLES, participants: [{ role: 'partner', user_id: null }, { role: 'opponent2', user_id: 'dave' }] }
        expect(buildConfirmation(guest, 'alice').confirmProgress.total).toBe(3)
        // 단식은 2
        expect(buildConfirmation(REQ, 'alice').confirmProgress.total).toBe(2)
    })

    it('확인 배열을 부착하지 않으면 0/n — 권한이 과소로 무너진다', () => {
        const noArr = { ...DOUBLES, confirmed_by: undefined }
        expect(buildConfirmation(noArr, 'bob').confirmedByMe).toBe(false)
        expect(buildConfirmation(noArr, 'bob').confirmProgress.confirmed).toBe(0)
    })

    it('좌석마다 제안 세트를 자기 관점으로 준다 — 팀 안쪽은 스코어가 같고 애드만 바뀐다', () => {
        const ad: ConfirmationSourceRow = { ...DOUBLES, proposed_set_scores: [{ me: 6, opp: 4, myAd: 'me' }] }
        expect(buildConfirmation(ad, 'alice').proposedSets).toEqual([{ me: 6, opp: 4, myAd: 'me' }])
        expect(buildConfirmation(ad, 'carol').proposedSets).toEqual([{ me: 6, opp: 4, myAd: 'partner' }])
        expect(buildConfirmation(ad, 'bob').proposedSets).toEqual([{ me: 4, opp: 6, oppAd: 'opponent' }])
        expect(buildConfirmation(ad, 'dave').proposedSets).toEqual([{ me: 4, opp: 6, oppAd: 'opponent' }])
    })

    it('이의 사유와 비배열 제안값을 안전하게 매핑', () => {
        const c = buildConfirmation(
            { ...REQ, result_status: 'disputed', dispute_reason: '2세트는 6-3', proposed_set_scores: null, confirmed_by: [] },
            'alice',
        )
        expect(c.status).toBe('disputed')
        expect(c.disputeReason).toBe('2세트는 6-3')
        expect(c.proposedSets).toEqual([])
    })
})

describe('이의 제기자 (0061)', () => {
    // bob이 제안, dave(상대2)가 이의
    // dispute_count는 dispute RPC가 올린다(0062) — 실제 disputed 행은 언제나 1 이상이다
    const DISPUTED: ConfirmationSourceRow = {
        ...DOUBLES, result_status: 'disputed', dispute_reason: '2게임 6-3', confirmed_by: [],
        disputed_by: 'dave', dispute_count: 1,
    }
    const seats = [
        { userId: 'carol', name: '캐롤' }, { userId: 'bob', name: '밥' }, { userId: 'dave', name: '데이브' },
    ]

    it('buildConfirmation — disputedByMe는 이의자에게만, disputedBy는 전원에게 같은 값', () => {
        expect(buildConfirmation(DISPUTED, 'dave')).toMatchObject({ disputedByMe: true, disputedBy: 'dave' })
        expect(buildConfirmation(DISPUTED, 'bob')).toMatchObject({ disputedByMe: false, disputedBy: 'dave' })
        expect(buildConfirmation(DISPUTED, 'alice')).toMatchObject({ disputedByMe: false, disputedBy: 'dave' })
    })

    it('부착하지 않으면(0061 이전 행·미부착 경로) 미상 — false/undefined로 무너진다', () => {
        const legacy = { ...DISPUTED, disputed_by: undefined }
        expect(buildConfirmation(legacy, 'dave')).toMatchObject({ disputedByMe: false, disputedBy: undefined })
    })

    it('isReentryTurn — 제안자만 다시 입력할 차례', () => {
        expect(isReentryTurn(buildConfirmation(DISPUTED, 'bob'))).toBe(true)     // 제안자
        expect(isReentryTurn(buildConfirmation(DISPUTED, 'dave'))).toBe(false)   // 이의자
        expect(isReentryTurn(buildConfirmation(DISPUTED, 'alice'))).toBe(false)  // 상대팀
        expect(isReentryTurn(buildConfirmation(DISPUTED, 'carol'))).toBe(false)  // 제안자의 파트너
    })

    it('isReentryTurn — 제안자 본인이 정정(reopen)해도 그 사람이 차례다 (교착 방지 회귀)', () => {
        const selfReopen = { ...DISPUTED, disputed_by: 'bob' }
        expect(isReentryTurn(buildConfirmation(selfReopen, 'bob'))).toBe(true)
    })

    it('isReentryTurn — disputed가 아니거나 좌석이 없으면 false', () => {
        expect(isReentryTurn(buildConfirmation(DOUBLES, 'bob'))).toBe(false)      // proposed
        expect(isReentryTurn(buildConfirmation(DISPUTED, 'eve'))).toBe(false)     // 무관자
        expect(isReentryTurn(buildConfirmation({ ...REQ, result_status: 'disputed' }, 'carol'))).toBe(false)  // 참가자 미부착
        expect(isReentryTurn(undefined)).toBe(false)
    })

    it("disputerNameOf — 나면 '나', 좌석에서 찾으면 이름, 미상이면 undefined", () => {
        expect(disputerNameOf(buildConfirmation(DISPUTED, 'dave'), seats)).toBe('나')
        expect(disputerNameOf(buildConfirmation(DISPUTED, 'bob'), seats)).toBe('데이브')
        expect(disputerNameOf(buildConfirmation({ ...DISPUTED, disputed_by: null }, 'bob'), seats)).toBeUndefined()
        // userId 없는 비회원 슬롯은 건너뛴다 / 좌석 목록에 없는 id도 미상
        expect(disputerNameOf(buildConfirmation(DISPUTED, 'bob'), [{ name: '비회원' }])).toBeUndefined()
        expect(disputerNameOf(buildConfirmation(DOUBLES, 'bob'), seats)).toBeUndefined()  // 이의 이력 없음
        expect(disputerNameOf(undefined, seats)).toBeUndefined()
    })

    it('disputerNameOf — 재제안으로 proposed가 되어도 이름이 해석된다 (0062)', () => {
        // dispute → propose 왕복 후의 실제 행: 상태는 proposed, 이의자·사유·카운터는 남아 있다
        const reproposed = { ...DISPUTED, result_status: 'proposed', proposed_by: 'bob', confirmed_by: ['bob'] }
        expect(disputerNameOf(buildConfirmation(reproposed, 'alice'), seats)).toBe('데이브')
        expect(disputerNameOf(buildConfirmation(reproposed, 'dave'), seats)).toBe('나')
    })

    it('disputeBadge — 세 문구 + 툴팁은 사유(없으면 폴백)', () => {
        const c = buildConfirmation(DISPUTED, 'bob')
        expect(disputeBadge(c, '나')).toEqual({ label: '내가 이의 제기', title: '2게임 6-3' })
        expect(disputeBadge(c, '데이브')).toEqual({ label: '데이브님 이의', title: '2게임 6-3' })
        expect(disputeBadge(c, undefined).label).toBe('이의 제기됨')
        expect(disputeBadge(buildConfirmation({ ...DISPUTED, dispute_reason: null }, 'bob')).title)
            .toBe('제안 결과에 이의가 제기됐습니다')
    })

    it('hasDisputeHistory — 상태가 아니라 누적 횟수를 본다 (0062)', () => {
        expect(hasDisputeHistory(buildConfirmation(DISPUTED, 'bob'))).toBe(true)
        expect(hasDisputeHistory(buildConfirmation(DOUBLES, 'bob'))).toBe(false)
        // 재제안으로 proposed가 되어도 참 — 이 값이 「이의 처리」 탭 라우팅을 붙잡는다
        const reproposed = { ...DISPUTED, result_status: 'proposed' }
        expect(hasDisputeHistory(buildConfirmation(reproposed, 'bob'))).toBe(true)
        // 이의자가 탈퇴해 disputed_by가 null이 되어도 사실은 남는다
        const orphan = { ...reproposed, disputed_by: null }
        expect(hasDisputeHistory(buildConfirmation(orphan, 'bob'))).toBe(true)
        // 부착 누락·0061 이전 행은 0 → 종전 라우팅(표시 과소)
        expect(hasDisputeHistory(buildConfirmation({ ...DISPUTED, dispute_count: undefined }, 'bob'))).toBe(false)
        expect(hasDisputeHistory(undefined)).toBe(false)
    })

    it('reentryBadge — 세 문구 + 2차 이상은 라운드 표시, 툴팁은 직전 사유', () => {
        const c = buildConfirmation({ ...DISPUTED, result_status: 'proposed' }, 'bob')
        expect(reentryBadge(c, '나')).toEqual({ label: '내 이의 후 재입력', title: '직전 이의 사유: 2게임 6-3' })
        expect(reentryBadge(c, '데이브').label).toBe('데이브님 이의 후 재입력')
        expect(reentryBadge(c, undefined).label).toBe('이의 후 재입력')

        const second = buildConfirmation({ ...DISPUTED, result_status: 'proposed', dispute_count: 2 }, 'bob')
        expect(reentryBadge(second, '데이브').label).toBe('데이브님 이의 후 재입력 (2차)')

        const noReason = buildConfirmation({ ...DISPUTED, result_status: 'proposed', dispute_reason: null }, 'bob')
        expect(reentryBadge(noReason, '나').title).toBe('이의가 제기된 뒤 다시 입력된 결과입니다')
    })
})

describe('canRespondToProposal — 만장일치의 단일 출처', () => {
    it('제안자도 아니고 아직 확인하지 않은 좌석만 확인·이의할 수 있다', () => {
        expect(canRespondToProposal(buildConfirmation(DOUBLES, 'alice'))).toBe(true)   // 상대팀
        expect(canRespondToProposal(buildConfirmation(DOUBLES, 'carol'))).toBe(true)
        expect(canRespondToProposal(buildConfirmation(DOUBLES, 'dave'))).toBe(true)    // 제안자의 파트너도 한 표
        expect(canRespondToProposal(buildConfirmation(DOUBLES, 'bob'))).toBe(false)    // 제안자 본인
    })

    it('이미 확인한 좌석은 남은 좌석을 기다린다', () => {
        const partial = { ...DOUBLES, confirmed_by: ['bob', 'carol'] }
        expect(canRespondToProposal(buildConfirmation(partial, 'carol'))).toBe(false)
        expect(canRespondToProposal(buildConfirmation(partial, 'alice'))).toBe(true)
    })

    it('proposed가 아니거나 좌석이 없으면 false', () => {
        expect(canRespondToProposal(buildConfirmation({ ...DOUBLES, result_status: 'none' }, 'alice'))).toBe(false)
        expect(canRespondToProposal(buildConfirmation(DOUBLES, 'eve'))).toBe(false)
        expect(canRespondToProposal(undefined)).toBe(false)
    })
})

describe('formatConfirmProgress', () => {
    it("복식은 '1/4명 확인', 단식은 진행도라는 개념이 없어 빈 문자열", () => {
        expect(formatConfirmProgress(buildConfirmation(DOUBLES, 'alice'))).toBe('1/4명 확인')
        expect(formatConfirmProgress(buildConfirmation({ ...DOUBLES, confirmed_by: ['bob', 'carol', 'dave'] }, 'alice'))).toBe('3/4명 확인')
        expect(formatConfirmProgress(buildConfirmation(REQ, 'alice'))).toBe('')
    })

    it('제안 중이 아니면 빈 문자열', () => {
        expect(formatConfirmProgress(buildConfirmation({ ...DOUBLES, result_status: 'disputed' }, 'alice'))).toBe('')
        expect(formatConfirmProgress(undefined)).toBe('')
    })
})

describe('bystanderWaitingBadge', () => {
    // 참가자를 부착하지 않은 조회 경로 — 좌석을 못 찾아 협상 자격이 없다(0059 이후 폴백 전용)
    const forPartner = (row: Partial<ConfirmationSourceRow>) =>
        bystanderWaitingBadge(buildConfirmation({ ...REQ, ...row }, 'carol'))

    it('협상 행을 못 읽으면 종전 문구로 폴백한다', () => {
        expect(bystanderWaitingBadge(undefined).label).toBe('참가자 확인 대기')
    })

    it('제안 전/후/이의를 문구로 구분한다', () => {
        expect(forPartner({ result_status: 'none', proposed_by: null }).label).toBe('결과 입력 대기')
        expect(forPartner({ result_status: 'proposed' }).label).toBe('참가자 확인 대기')

        const disputed = forPartner({ result_status: 'disputed', dispute_reason: '2세트는 6-3' })
        expect(disputed.label).toBe('이의 제기됨')
        expect(disputed.title).toBe('2세트는 6-3')
    })

    it('confirmed인데 세트가 없는 불가능 조합은 폴백한다', () => {
        expect(forPartner({ result_status: 'confirmed' }).label).toBe('참가자 확인 대기')
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

describe('canReopenResult', () => {
    const conf = (status: string, viewerIsParty: boolean) =>
        buildConfirmation({ ...REQ, result_status: status }, viewerIsParty ? 'alice' : 'carol')

    it('확정 + 요청 좌석이면 되돌릴 수 있다', () => {
        expect(canReopenResult(conf('confirmed', true))).toBe(true)
    })

    it('확정이어도 좌석을 못 찾으면(참가자 미부착 폴백) 되돌릴 수 없다', () => {
        expect(canReopenResult(conf('confirmed', false))).toBe(false)
    })

    it('아직 확정되지 않은 상태에서는 되돌릴 것이 없다', () => {
        for (const status of ['none', 'proposed', 'disputed']) {
            expect(canReopenResult(conf(status, true))).toBe(false)
        }
    })

    it('협상 행을 못 읽으면 false', () => {
        expect(canReopenResult(undefined)).toBe(false)
    })
})

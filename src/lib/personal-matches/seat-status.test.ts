import { describe, expect, it } from 'vitest'
import type { PersonalMatchConfirmation } from '@/types'
import {
    confirmSeatStatuses, groupSeatNames, seatStateLabel, shouldShowSeatStatuses,
} from '@/lib/personal-matches/seat-status'

const PARTNER = 'u-partner'
const OPP = 'u-opp'
const OPP2 = 'u-opp2'

function confirmation(over: Partial<PersonalMatchConfirmation> = {}): PersonalMatchConfirmation {
    return {
        requestId: 'r1',
        status: 'proposed',
        proposedByMe: false,
        confirmedByMe: false,
        confirmProgress: { confirmed: 1, total: 4 },
        confirmedUserIds: [],
        proposedBy: undefined,
        inactiveUserIds: [],
        proposedSets: [],
        disputedByMe: false,
        disputeRound: 0,
        viewerIsParty: true,
        ...over,
    }
}

const DOUBLES_SEATS = [
    { userId: PARTNER, name: '파트너' },
    { userId: OPP, name: '상대1' },
    { userId: OPP2, name: '상대2' },
]

describe('confirmSeatStatuses', () => {
    it('첫 항목은 언제나 뷰어이고, 제안자·확인·미확인이 갈린다', () => {
        const c = confirmation({ proposedBy: PARTNER, confirmedUserIds: [PARTNER, OPP] })
        expect(confirmSeatStatuses(c, DOUBLES_SEATS)).toEqual([
            { name: '나', state: 'pending' },
            { name: '파트너', state: 'proposer' },
            { name: '상대1', state: 'confirmed' },
            { name: '상대2', state: 'pending' },
        ])
    })

    it('내가 제안자면 나는 proposer, 내가 확인했으면 confirmed', () => {
        const mine = confirmSeatStatuses(confirmation({ proposedByMe: true }), DOUBLES_SEATS)
        expect(mine[0]).toEqual({ name: '나', state: 'proposer' })

        const done = confirmSeatStatuses(confirmation({ confirmedByMe: true }), DOUBLES_SEATS)
        expect(done[0]).toEqual({ name: '나', state: 'confirmed' })
    })

    it('user_id가 없는 좌석은 비회원 — 확인 절차 없이 자동 동의다', () => {
        const seats = [{ name: '게스트' }, { userId: OPP, name: '상대1' }]
        const out = confirmSeatStatuses(confirmation(), seats)
        expect(out.map((s) => s.state)).toEqual(['pending', 'guest', 'pending'])
    })

    it('탈퇴한 좌석은 pending이 아니라 left — 오지 않을 확인을 기다리게 두지 않는다', () => {
        const c = confirmation({ inactiveUserIds: [OPP2] })
        const out = confirmSeatStatuses(c, DOUBLES_SEATS)
        expect(out.find((s) => s.name === '상대2')?.state).toBe('left')
    })

    it('탈퇴 판정이 확인·제안보다 앞선다 — 옛 확인이 남아 있어도 left다', () => {
        const c = confirmation({ inactiveUserIds: [OPP], confirmedUserIds: [OPP], proposedBy: OPP })
        expect(confirmSeatStatuses(c, DOUBLES_SEATS).find((s) => s.name === '상대1')?.state).toBe('left')
    })

    it('이름이 빈 슬롯은 목록에서 뺀다 — 이름 없는 확인 대기는 정보가 아니다', () => {
        const seats = [{ userId: PARTNER, name: '  ' }, { userId: OPP, name: '상대1' }]
        expect(confirmSeatStatuses(confirmation(), seats).map((s) => s.name)).toEqual(['나', '상대1'])
    })

    it('좌석이 없는 관점 행에는 나를 넣지 않는다 — 확인 대상이 아니다', () => {
        const c = confirmation({ viewerIsParty: false })
        expect(confirmSeatStatuses(c, DOUBLES_SEATS).map((s) => s.name)).toEqual(['파트너', '상대1', '상대2'])
    })

    it('단식은 나와 상대 둘뿐이다', () => {
        const out = confirmSeatStatuses(confirmation(), [{ userId: OPP, name: '상대' }])
        expect(out).toHaveLength(2)
    })
})

describe('groupSeatNames', () => {
    it('입력 · 확인 완료 · 확인 대기 · 자동 동의 · 탈퇴 순으로 묶는다', () => {
        const c = confirmation({ proposedBy: PARTNER, confirmedUserIds: [PARTNER, OPP], inactiveUserIds: [OPP2] })
        const seats = [...DOUBLES_SEATS, { name: '게스트' }]
        expect(groupSeatNames(confirmSeatStatuses(c, seats))).toEqual([
            { state: 'proposer', names: ['파트너'] },
            { state: 'confirmed', names: ['상대1'] },
            { state: 'pending', names: ['나'] },
            { state: 'guest', names: ['게스트'] },
            { state: 'left', names: ['상대2'] },
        ])
    })

    it('비어 있는 상태는 묶음에서 사라진다', () => {
        const c = confirmation({ proposedByMe: true })
        const states = groupSeatNames(confirmSeatStatuses(c, [{ userId: OPP, name: '상대' }]))
            .map((g) => g.state)
        expect(states).toEqual(['proposer', 'pending'])
    })
})

describe('shouldShowSeatStatuses', () => {
    it('제안된 상태에서만 명단이 의미를 갖는다', () => {
        expect(shouldShowSeatStatuses(confirmation({ status: 'proposed' }))).toBe(true)
        expect(shouldShowSeatStatuses(confirmation({ status: 'none' }))).toBe(false)
        expect(shouldShowSeatStatuses(confirmation({ status: 'disputed' }))).toBe(false)
        expect(shouldShowSeatStatuses(confirmation({ status: 'confirmed' }))).toBe(false)
        expect(shouldShowSeatStatuses(undefined)).toBe(false)
    })
})

describe('seatStateLabel', () => {
    it('상태마다 한국어 라벨이 있다', () => {
        expect(seatStateLabel('proposer')).toBe('결과를 입력한 사람')
        expect(seatStateLabel('guest')).toBe('자동 동의')
        expect(seatStateLabel('left')).toBe('탈퇴')
    })
})

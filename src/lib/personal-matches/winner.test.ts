import { describe, expect, it } from 'vitest'
import { resolveMatchWinner, resolveSetWinner, tallySets } from './winner'

describe('tallySets', () => {
    it('세트 1개 = 게임 1개로 승/패/무를 센다', () => {
        expect(tallySets([{ me: 6, opp: 4 }, { me: 3, opp: 6 }, { me: 5, opp: 5 }, { me: 7, opp: 5 }]))
            .toEqual({ wins: 2, losses: 1, draws: 1 })
    })

    it('빈 배열은 0/0/0', () => {
        expect(tallySets([])).toEqual({ wins: 0, losses: 0, draws: 0 })
    })
})

describe('resolveSetWinner / resolveMatchWinner', () => {
    it('한 세트 승자', () => {
        expect(resolveSetWinner({ me: 6, opp: 4 })).toBe('me')
        expect(resolveSetWinner({ me: 4, opp: 6 })).toBe('opponent')
        expect(resolveSetWinner({ me: 6, opp: 6 })).toBe('draw')
    })

    it('종합 승자는 세트 승수 비교 (저장 시 winner 파생용)', () => {
        expect(resolveMatchWinner([{ me: 6, opp: 4 }, { me: 3, opp: 6 }, { me: 6, opp: 2 }])).toBe('me')
        expect(resolveMatchWinner([{ me: 6, opp: 4 }, { me: 3, opp: 6 }])).toBe('draw')
    })
})

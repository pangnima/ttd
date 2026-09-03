import { describe, expect, it } from 'vitest'
import type { PersonalMatch } from '@/types'
import { hasResult, resolveSetWinner, tallySets } from './winner'

const base: PersonalMatch = {
    id: 'a', userId: 'me', opponentName: 'X', playedAt: '2026-06-10', matchType: 'singles', setScores: [], createdAt: '2026-06-10',
}

describe('hasResult', () => {
    it('게임 스코어가 하나라도 있으면 확정, 빈 배열이면 미확정', () => {
        expect(hasResult(base)).toBe(false)
        expect(hasResult({ ...base, setScores: [{ me: 6, opp: 4 }] })).toBe(true)
    })
})

describe('tallySets', () => {
    it('세트 1개 = 게임 1개로 승/패/무를 센다', () => {
        expect(tallySets([{ me: 6, opp: 4 }, { me: 3, opp: 6 }, { me: 5, opp: 5 }, { me: 7, opp: 5 }]))
            .toEqual({ wins: 2, losses: 1, draws: 1 })
    })

    it('빈 배열은 0/0/0', () => {
        expect(tallySets([])).toEqual({ wins: 0, losses: 0, draws: 0 })
    })
})

describe('resolveSetWinner', () => {
    it('한 세트(게임) 승자', () => {
        expect(resolveSetWinner({ me: 6, opp: 4 })).toBe('me')
        expect(resolveSetWinner({ me: 4, opp: 6 })).toBe('opponent')
        expect(resolveSetWinner({ me: 6, opp: 6 })).toBe('draw')
    })
})

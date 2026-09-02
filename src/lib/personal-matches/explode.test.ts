import { describe, expect, it } from 'vitest'
import type { PersonalMatch, PersonalMatchSetScore } from '@/types'
import { explodePersonalMatchSets } from './explode'

function pm(id: string, setScores: PersonalMatchSetScore[], winner: PersonalMatch['winner']): PersonalMatch {
    return { id, userId: 'me', opponentName: 'X', playedAt: '2026-06-01', matchType: 'singles', setScores, winner, createdAt: '2026-06-01' }
}

describe('explodePersonalMatchSets', () => {
    it('멀티 세트 레코드를 세트 수만큼 가상 경기로 분해', () => {
        const games = explodePersonalMatchSets([
            pm('a', [{ me: 6, opp: 4 }, { me: 3, opp: 6 }, { me: 7, opp: 5 }], 'me'),
        ])
        expect(games).toHaveLength(3)
        expect(games.map((g) => g.id)).toEqual(['a#0', 'a#1', 'a#2'])
        // 세트별 winner 재판정
        expect(games.map((g) => g.winner)).toEqual(['me', 'opponent', 'me'])
        // 각 가상 경기는 단일 세트
        expect(games.every((g) => g.setScores.length === 1)).toBe(true)
        // 메타데이터는 원본 복사
        expect(games[0].opponentName).toBe('X')
    })

    it('동점 세트는 draw로 분해', () => {
        const games = explodePersonalMatchSets([pm('b', [{ me: 6, opp: 6 }], 'draw')])
        expect(games).toHaveLength(1)
        expect(games[0].winner).toBe('draw')
        expect(games[0].id).toBe('b#0')
    })

    it('세트가 없으면 원본을 그대로 유지', () => {
        const games = explodePersonalMatchSets([pm('c', [], 'draw')])
        expect(games).toHaveLength(1)
        expect(games[0].id).toBe('c')
    })

    it('결과 미확정(winner null) 레코드는 세트 유무와 무관하게 제외', () => {
        const games = explodePersonalMatchSets([
            pm('d', [], null),
            pm('e', [{ me: 6, opp: 4 }], null),
            pm('f', [{ me: 6, opp: 2 }], 'me'),
        ])
        expect(games.map((g) => g.id)).toEqual(['f#0'])
    })

    it('빈 입력은 빈 배열', () => {
        expect(explodePersonalMatchSets([])).toEqual([])
    })
})

import { describe, expect, it } from 'vitest'
import type { PersonalMatch, PersonalMatchSetScore } from '@/types'
import { explodePersonalMatchSets } from './explode'

function pm(id: string, setScores: PersonalMatchSetScore[]): PersonalMatch {
    return { id, userId: 'me', opponentName: 'X', playedAt: '2026-06-01', matchType: 'singles', setScores, createdAt: '2026-06-01' }
}

describe('explodePersonalMatchSets', () => {
    it('멀티 세트 레코드를 세트 수만큼 가상 경기로 분해', () => {
        const games = explodePersonalMatchSets([
            pm('a', [{ me: 6, opp: 4 }, { me: 3, opp: 6 }, { me: 7, opp: 5 }]),
        ])
        expect(games).toHaveLength(3)
        expect(games.map((g) => g.id)).toEqual(['a#0', 'a#1', 'a#2'])
        // 세트별 winner 판정 (행 단위 승자는 없다)
        expect(games.map((g) => g.winner)).toEqual(['me', 'opponent', 'me'])
        // 각 가상 경기는 단일 세트
        expect(games.every((g) => g.setScores.length === 1)).toBe(true)
        // 메타데이터는 원본 복사
        expect(games[0].opponentName).toBe('X')
    })

    it('동점 세트는 draw로 분해', () => {
        const games = explodePersonalMatchSets([pm('b', [{ me: 6, opp: 6 }])])
        expect(games).toHaveLength(1)
        expect(games[0].winner).toBe('draw')
        expect(games[0].id).toBe('b#0')
    })

    it('결과 미확정(세트 없음) 레코드는 제외', () => {
        const games = explodePersonalMatchSets([
            pm('d', []),
            pm('f', [{ me: 6, opp: 2 }]),
        ])
        expect(games.map((g) => g.id)).toEqual(['f#0'])
    })

    it('빈 입력은 빈 배열', () => {
        expect(explodePersonalMatchSets([])).toEqual([])
    })
})

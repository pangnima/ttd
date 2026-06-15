import { describe, expect, it } from 'vitest'
import type { PersonalMatch } from '@/types'
import { groupByMonth } from './grouping'

function pm(id: string, playedAt: string, winner: PersonalMatch['winner']): PersonalMatch {
    return { id, userId: 'me', opponentName: 'X', playedAt, matchType: 'singles', setScores: [{ me: 6, opp: 4 }], winner, createdAt: playedAt }
}

describe('groupByMonth', () => {
    it('월 내림차순 그룹 + 월별 승패·승률', () => {
        const groups = groupByMonth([
            pm('a', '2026-06-08', 'me'),
            pm('b', '2026-06-01', 'opponent'),
            pm('c', '2026-05-20', 'me'),
            pm('d', '2026-06-15', 'me'),
        ])
        expect(groups.map((g) => g.ym)).toEqual(['2026-06', '2026-05'])
        const june = groups[0]
        expect(june.label).toBe('2026년 6월')
        expect(june).toMatchObject({ wins: 2, losses: 1, winRate: 67 })
        // 월내 최신순
        expect(june.matches.map((m) => m.id)).toEqual(['d', 'a', 'b'])
    })

    it('빈 입력', () => {
        expect(groupByMonth([])).toEqual([])
    })
})

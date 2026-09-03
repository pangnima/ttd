import { describe, expect, it } from 'vitest'
import type { PersonalMatch } from '@/types'
import { groupByMonth } from './grouping'

function pm(id: string, playedAt: string, winner: PersonalMatch['winner']): PersonalMatch {
    // 세트 1개 = 게임 1개 집계이므로 setScores를 winner와 일치시킨다.
    const setScores = winner === 'me'
        ? [{ me: 6, opp: 4 }]
        : winner === 'opponent'
            ? [{ me: 4, opp: 6 }]
            : [{ me: 6, opp: 6 }]
    return { id, userId: 'me', opponentName: 'X', playedAt, matchType: 'singles', setScores, winner, createdAt: playedAt }
}

const idsOf = (g: ReturnType<typeof groupByMonth>[number]) => g.groups.flatMap((x) => x.matches.map((m) => m.id))

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
        expect(idsOf(june)).toEqual(['d', 'a', 'b'])
    })

    it('멀티 세트는 세트(게임) 단위로 승패 집계하고 카드는 레코드 1건', () => {
        // 4세트(3승 1패) 1건 + 1세트(1패) 1건 → 게임 합산 3승 2패, 그룹(카드)은 2건
        const a: PersonalMatch = {
            id: 'a', userId: 'me', opponentName: 'X', playedAt: '2026-06-10', matchType: 'singles',
            setScores: [{ me: 6, opp: 4 }, { me: 6, opp: 2 }, { me: 3, opp: 6 }, { me: 7, opp: 5 }],
            winner: 'me', createdAt: '2026-06-10',
        }
        const b: PersonalMatch = {
            id: 'b', userId: 'me', opponentName: 'Y', playedAt: '2026-06-05', matchType: 'singles',
            setScores: [{ me: 4, opp: 6 }], winner: 'opponent', createdAt: '2026-06-05',
        }
        const [june] = groupByMonth([a, b])
        expect(june).toMatchObject({ wins: 3, losses: 2, winRate: 60 })
        expect(june.groups).toHaveLength(2)
        expect(june.groups[0].gameCount).toBe(4)
        expect(idsOf(june)).toEqual(['a', 'b'])
    })

    it('결과 미확정(winner null) 행은 월 전적에서 제외하되 카드에는 남긴다', () => {
        const pending: PersonalMatch = {
            id: 'p', userId: 'me', opponentName: 'X', playedAt: '2026-06-20', matchType: 'singles',
            setScores: [], winner: null, createdAt: '2026-06-20',
        }
        const [june] = groupByMonth([pending, pm('a', '2026-06-08', 'me')])
        expect(june).toMatchObject({ wins: 1, losses: 0, draws: 0 })
        expect(idsOf(june)).toEqual(['p', 'a'])
    })

    it('같은 로테이션 세션 게임은 한 그룹으로 묶인다', () => {
        const rot = (id: string, seq: number, winner: PersonalMatch['winner']) => ({
            ...pm(id, '2026-06-12', winner), rotationSessionId: 's1', groupSeq: seq, matchType: 'men_doubles' as const,
        })
        const [june] = groupByMonth([rot('r2', 2, 'opponent'), pm('a', '2026-06-08', 'me'), rot('r1', 1, 'me')])
        expect(june.groups.map((g) => g.kind)).toEqual(['rotation', 'record'])
        expect(june.groups[0].matches.map((m) => m.id)).toEqual(['r1', 'r2'])
        expect(june).toMatchObject({ wins: 2, losses: 1 })
    })

    it('빈 입력', () => {
        expect(groupByMonth([])).toEqual([])
    })
})

import { describe, expect, it } from 'vitest'
import type { Match, PersonalMatch } from '@/types'
import { aggregatePartnerChemistry } from './partner-chemistry'

const ME = 'me'

// 남자복식 클럽 매치: 내 팀 = [me, partner]
function dbl(id: string, partner: string, winnerId: 'team1' | 'team2' | 'draw'): Match {
    return {
        id, matchGameId: id, roundId: 'r', courtId: 'c', timeSlotId: 't',
        matchType: 'men_doubles', team1: [ME, partner], team2: ['x', 'y'],
        status: 'finished', result: { sets: [{ team1: 6, team2: 4 }], winnerId },
    }
}

function meta(...ids: { id: string; date: string }[]): Record<string, { date: string }> {
    return Object.fromEntries(ids.map((x) => [x.id, { date: x.date }]))
}

describe('aggregatePartnerChemistry', () => {
    it('minGames(3) 미만 파트너 제외', () => {
        const matches = [
            dbl('m1', 'P', 'team1'),
            dbl('m2', 'P', 'team1'),
        ]
        const r = aggregatePartnerChemistry(
            { matches, gameMetaById: meta({ id: 'm1', date: '2026-06-01' }, { id: 'm2', date: '2026-06-02' }), personalMatches: [] },
            ME, 'male', 3,
        )
        expect(r).toEqual([])
    })

    it('케미식 단위 검증: winRate=100, recent=100, total=20 → 100', () => {
        const matches = Array.from({ length: 20 }, (_, i) => dbl(`m${i}`, 'P', 'team1'))
        const gameMetaById = Object.fromEntries(matches.map((m, i) => [m.id, { date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}` }]))
        const r = aggregatePartnerChemistry({ matches, gameMetaById, personalMatches: [] }, ME, 'male', 3)
        expect(r[0].winRate).toBe(100)
        expect(r[0].chemistry).toBe(100)
    })

    it('현재 연승(streakType=W) 계산', () => {
        const matches = [
            dbl('m1', 'P', 'team2'), // 패(가장 과거)
            dbl('m2', 'P', 'team1'), // 승
            dbl('m3', 'P', 'team1'), // 승
            dbl('m4', 'P', 'team1'), // 승(최신)
        ]
        const gameMetaById = meta(
            { id: 'm1', date: '2026-06-01' }, { id: 'm2', date: '2026-06-02' },
            { id: 'm3', date: '2026-06-03' }, { id: 'm4', date: '2026-06-04' },
        )
        const r = aggregatePartnerChemistry({ matches, gameMetaById, personalMatches: [] }, ME, 'male', 3)
        expect(r[0].streakType).toBe('W')
        expect(r[0].currentStreak).toBe(3)
    })

    it('성별 필터: 여성은 여복+혼복만', () => {
        const womenMatch: Match = {
            id: 'w1', matchGameId: 'w1', roundId: 'r', courtId: 'c', timeSlotId: 't',
            matchType: 'women_doubles', team1: [ME, 'P'], team2: ['x', 'y'],
            status: 'finished', result: { sets: [{ team1: 6, team2: 4 }], winnerId: 'team1' },
        }
        const menMatches = [
            dbl('m1', 'Q', 'team1'),
            dbl('m2', 'Q', 'team1'),
            dbl('m3', 'Q', 'team1'),
        ]
        const matches = [womenMatch, ...menMatches]
        const gameMetaById = meta(
            { id: 'w1', date: '2026-05-01' }, { id: 'm1', date: '2026-06-01' },
            { id: 'm2', date: '2026-06-02' }, { id: 'm3', date: '2026-06-03' },
        )
        const r = aggregatePartnerChemistry({ matches, gameMetaById, personalMatches: [] }, ME, 'female', 1)
        // 여성 필터 → 남복(Q) 제외, 여복(P)만
        expect(r.every((p) => p.matchType === 'women_doubles')).toBe(true)
    })

    it('외부 파트너(개인 복식, userId 없음)도 집계', () => {
        const personalMatches: PersonalMatch[] = [1, 2, 3].map((i) => ({
            id: `p${i}`, userId: ME, opponentName: 'opp',
            partnerName: '김파트너',
            playedAt: `2026-06-0${i}`, matchType: 'men_doubles',
            setScores: [{ me: 6, opp: 4 }], winner: 'me', createdAt: `2026-06-0${i}`,
        }))
        const r = aggregatePartnerChemistry({ matches: [], gameMetaById: {}, personalMatches }, ME, 'male', 3)
        expect(r).toHaveLength(1)
        expect(r[0].partnerId).toBe('name:김파트너')
        expect(r[0].partnerName).toBe('김파트너')
    })
})

import { describe, expect, it } from 'vitest'
import type { Match } from '@/types'
import type { SettledPersonalMatch } from '@/lib/personal-matches/winner'
import { buildHeadToHeadList } from './head-to-head'
import { selectRivals } from './rival'

const ME = 'me'

function clubVs(id: string, oppId: string, winnerId: 'team1' | 'team2' | 'draw'): Match {
    return {
        id, matchGameId: id, roundId: 'r', courtId: 'c', timeSlotId: 't',
        matchType: 'singles', player1Id: ME, player2Id: oppId,
        status: 'finished', result: { sets: [{ team1: 6, team2: 4 }], winnerId },
    }
}

// 상대 oppId에 대해 wins승/losses패 매치 생성
function vsRecord(oppId: string, wins: number, losses: number): Match[] {
    const out: Match[] = []
    for (let i = 0; i < wins; i++) out.push(clubVs(`${oppId}-w${i}`, oppId, 'team1'))
    for (let i = 0; i < losses; i++) out.push(clubVs(`${oppId}-l${i}`, oppId, 'team2'))
    return out
}

describe('selectRivals (승률 45~55% 박빙)', () => {
    const matches: Match[] = [
        ...vsRecord('even', 3, 3),   // 50% (6경기) — 가장 박빙
        ...vsRecord('low', 5, 6),    // 45% (11경기)
        ...vsRecord('high', 6, 5),   // 55% (11경기)
        ...vsRecord('strong', 7, 3), // 70% — 밴드 밖 제외
        ...vsRecord('few', 1, 1),    // 2경기 — minGames 미만 제외
    ]
    const gameMetaById = Object.fromEntries(matches.map((m) => [m.id, { date: '2026-06-01' }]))
    const bundle = { matches, gameMetaById, personalMatches: [] as SettledPersonalMatch[], courtSurfaceByMatchId: {} }

    it('45~55%만 포함하고 50%에 가까운 순으로 정렬', () => {
        const h2h = buildHeadToHeadList(bundle, ME)
        const rivals = selectRivals(bundle, ME, h2h, new Map(), 3)
        expect(rivals.map((r) => r.key)).toContain('even')
        expect(rivals.map((r) => r.key)).not.toContain('strong')
        expect(rivals.map((r) => r.key)).not.toContain('few')
        expect(rivals[0].key).toBe('even') // 50% 가장 박빙
        expect(rivals.every((r) => r.winRate >= 45 && r.winRate <= 55)).toBe(true)
    })

    it('박빙 상대가 없으면 빈 배열', () => {
        const onlyStrong = {
            matches: vsRecord('strong', 8, 2),
            gameMetaById: {} as Record<string, { date: string }>,
            personalMatches: [] as SettledPersonalMatch[],
            courtSurfaceByMatchId: {},
        }
        for (const m of onlyStrong.matches) onlyStrong.gameMetaById[m.id] = { date: '2026-06-01' }
        const h2h = buildHeadToHeadList(onlyStrong, ME)
        expect(selectRivals(onlyStrong, ME, h2h, new Map(), 3)).toEqual([])
    })
})

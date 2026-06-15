import { describe, expect, it } from 'vitest'
import type { Match, PersonalMatch, PersonalMatchSetScore } from '@/types'
import { aggregateByDoublesCourtSide } from './doubles-court'

const ME = 'me'

// 개인 복식 경기 픽스처 (분해본 = 단일 세트)
function pmDoubles(
    set: PersonalMatchSetScore,
    winner: PersonalMatch['winner'],
): PersonalMatch {
    return {
        id: 'p', userId: ME, opponentName: 'X', playedAt: '2026-06-01',
        matchType: 'men_doubles', setScores: [set], winner, createdAt: '2026-06-01',
    }
}

function pmSingles(winner: PersonalMatch['winner']): PersonalMatch {
    return {
        id: 's', userId: ME, opponentName: 'X', playedAt: '2026-06-01',
        matchType: 'singles', setScores: [{ me: 6, opp: 4 }], winner, createdAt: '2026-06-01',
    }
}

// 클럽 복식 경기 픽스처
function clubDoubles(opts: { team1AdPlayerId?: string; winnerId: 'team1' | 'team2' | 'draw' }): Match {
    return {
        id: 'c', matchGameId: 'g', roundId: 'r', courtId: 'ct', timeSlotId: 't',
        matchType: 'men_doubles',
        team1: [ME, 'mate'], team2: ['o1', 'o2'],
        team1AdPlayerId: opts.team1AdPlayerId,
        status: 'finished',
        result: { sets: [{ team1: 6, team2: 4 }], winnerId: opts.winnerId },
    }
}

describe('aggregateByDoublesCourtSide', () => {
    it('개인 복식 myAd=me → 애드 코트 집계', () => {
        const r = aggregateByDoublesCourtSide(
            { matches: [], personalMatches: [pmDoubles({ me: 6, opp: 4, myAd: 'me' }, 'me')] },
            ME,
        )
        expect(r.ad).toEqual({ matches: 1, wins: 1, losses: 0, draws: 0 })
        expect(r.deuce).toEqual({ matches: 0, wins: 0, losses: 0, draws: 0 })
    })

    it('개인 복식 myAd 미지정/파트너 → 듀스 코트 집계', () => {
        const r = aggregateByDoublesCourtSide(
            {
                matches: [],
                personalMatches: [
                    pmDoubles({ me: 4, opp: 6 }, 'opponent'),                 // 미지정
                    pmDoubles({ me: 6, opp: 6, myAd: 'partner' }, 'draw'),    // 파트너가 애드
                ],
            },
            ME,
        )
        expect(r.ad).toEqual({ matches: 0, wins: 0, losses: 0, draws: 0 })
        expect(r.deuce).toEqual({ matches: 2, wins: 0, losses: 1, draws: 1 })
    })

    it('단식 경기는 양쪽 모두 제외', () => {
        const r = aggregateByDoublesCourtSide(
            { matches: [], personalMatches: [pmSingles('me')] },
            ME,
        )
        expect(r.ad.matches).toBe(0)
        expect(r.deuce.matches).toBe(0)
    })

    it('클럽 복식: 사용자가 애드 플레이어이고 승리 → 애드 승', () => {
        const r = aggregateByDoublesCourtSide(
            { matches: [clubDoubles({ team1AdPlayerId: ME, winnerId: 'team1' })], personalMatches: [] },
            ME,
        )
        expect(r.ad).toEqual({ matches: 1, wins: 1, losses: 0, draws: 0 })
        expect(r.deuce.matches).toBe(0)
    })

    it('클럽 복식: 애드 플레이어가 아니면 듀스 집계', () => {
        const r = aggregateByDoublesCourtSide(
            { matches: [clubDoubles({ team1AdPlayerId: 'mate', winnerId: 'team2' })], personalMatches: [] },
            ME,
        )
        expect(r.deuce).toEqual({ matches: 1, wins: 0, losses: 1, draws: 0 })
        expect(r.ad.matches).toBe(0)
    })

    it('빈 입력 → 0 집계', () => {
        const r = aggregateByDoublesCourtSide({ matches: [], personalMatches: [] }, ME)
        expect(r).toEqual({
            ad: { matches: 0, wins: 0, losses: 0, draws: 0 },
            deuce: { matches: 0, wins: 0, losses: 0, draws: 0 },
        })
    })
})

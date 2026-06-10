import { describe, expect, it } from 'vitest'
import type { Match } from '@/types'
import {
    computeMatchDelta,
    expectedScore,
    marginFactor,
    pickK,
    replayClubRatings,
    roundRating,
} from './elo'
import { K_BASE, K_PROVISIONAL } from './constants'

// 단식 Match 생성 헬퍼 (재계산용 최소 필드).
function singles(
    id: string,
    p1: string,
    p2: string,
    winnerId: 'team1' | 'team2' | 'draw',
    sets: Array<{ team1: number; team2: number }>,
): Match {
    return {
        id,
        matchGameId: 'g1',
        roundId: 'r1',
        courtId: 'c1',
        timeSlotId: 't1',
        matchType: 'singles',
        player1Id: p1,
        player2Id: p2,
        status: 'finished',
        result: { sets, winnerId },
    }
}

describe('expectedScore', () => {
    it('동급은 0.5', () => {
        expect(expectedScore(2.5, 2.5)).toBeCloseTo(0.5, 6)
    })
    it('NTRP 1.0 차이는 강자 ≈ 0.909', () => {
        expect(expectedScore(4.0, 3.0)).toBeCloseTo(0.9091, 4)
    })
    it('NTRP 0.5 차이는 강자 ≈ 0.760', () => {
        expect(expectedScore(3.0, 2.5)).toBeCloseTo(0.7597, 4)
    })
})

describe('marginFactor', () => {
    it('압승(6-0,6-0)은 1.5', () => {
        expect(
            marginFactor([{ team1: 6, team2: 0 }, { team1: 6, team2: 0 }], 'team1'),
        ).toBeCloseTo(1.5, 6)
    })
    it('박빙(7-6,6-7,7-6)은 ≈ 1.0', () => {
        const mf = marginFactor(
            [{ team1: 7, team2: 6 }, { team1: 6, team2: 7 }, { team1: 7, team2: 6 }],
            'team1',
        )
        expect(mf).toBeGreaterThanOrEqual(1.0)
        expect(mf).toBeLessThan(1.02)
    })
    it('무승부·스코어 없음은 1.0', () => {
        expect(marginFactor([{ team1: 6, team2: 6 }], 'draw')).toBe(1)
        expect(marginFactor([], 'team1')).toBe(1)
    })
})

describe('pickK', () => {
    it('잠정기(<10경기)는 0.10', () => {
        expect(pickK(0)).toBe(K_PROVISIONAL)
        expect(pickK(9)).toBe(K_PROVISIONAL)
    })
    it('정착(>=10경기)은 0.05', () => {
        expect(pickK(10)).toBe(K_BASE)
    })
})

describe('computeMatchDelta — docs §2.8 Worked Examples', () => {
    // 예시 1: 이변승. A 2.5 가 B 4.0 을 6-4,6-4 로 이김 (정착 K=0.05, mf=1.10).
    it('이변승은 +0.053', () => {
        const delta = computeMatchDelta({
            selfRating: 2.5,
            oppRating: 4.0,
            selfScore: 1,
            k: 0.05,
            margin: 1.1,
        })
        expect(delta).toBeCloseTo(0.0533, 3)
    })
    // 예시 2: 강자 예상 압승. B 4.0 이 A 2.5 를 6-1,6-2 로 이김 (K=0.05, mf=1.30).
    it('강자 압승은 거의 불변 +0.002', () => {
        const delta = computeMatchDelta({
            selfRating: 4.0,
            oppRating: 2.5,
            selfScore: 1,
            k: 0.05,
            margin: 1.3,
        })
        expect(delta).toBeCloseTo(0.002, 3)
    })
})

describe('replayClubRatings', () => {
    // 예시 3: 잠정기 신규 강자. C 2.5 가 D 2.5 를 6-1,6-0 으로 이김 (둘 다 첫 경기 K=0.10).
    it('잠정기 신규 강자는 2.500 → 2.571 로 빠르게 상승', () => {
        const { ratings } = replayClubRatings([
            singles('m1', 'C', 'D', 'team1', [
                { team1: 6, team2: 1 },
                { team1: 6, team2: 0 },
            ]),
        ])
        expect(roundRating(ratings.get('C')!.rating)).toBeCloseTo(2.571, 3)
        expect(roundRating(ratings.get('D')!.rating)).toBeCloseTo(2.429, 3)
        expect(ratings.get('C')!.matchesPlayed).toBe(1)
    })

    it('승자는 오르고 패자는 같은 크기만큼 내린다 (동급 K=대칭)', () => {
        const { ratings, history } = replayClubRatings([
            singles('m1', 'C', 'D', 'team1', [{ team1: 6, team2: 1 }, { team1: 6, team2: 0 }]),
        ])
        const up = ratings.get('C')!.rating - 2.5
        const down = 2.5 - ratings.get('D')!.rating
        expect(up).toBeCloseTo(down, 9)
        expect(history).toHaveLength(2)
    })

    it('결정적: 동일 입력은 동일 스냅샷', () => {
        const matches = [
            singles('m1', 'A', 'B', 'team1', [{ team1: 6, team2: 4 }, { team1: 6, team2: 4 }]),
            singles('m2', 'B', 'A', 'team1', [{ team1: 6, team2: 2 }, { team1: 6, team2: 3 }]),
        ]
        const first = replayClubRatings(matches)
        const second = replayClubRatings(matches)
        expect(first.ratings.get('A')!.rating).toBe(second.ratings.get('A')!.rating)
        expect(first.ratings.get('B')!.rating).toBe(second.ratings.get('B')!.rating)
    })

    it('result 없는 경기는 건너뛴다', () => {
        const noResult: Match = {
            id: 'm1',
            matchGameId: 'g1',
            roundId: 'r1',
            courtId: 'c1',
            timeSlotId: 't1',
            matchType: 'singles',
            player1Id: 'A',
            player2Id: 'B',
            status: 'scheduled',
        }
        const { ratings, history } = replayClubRatings([noResult])
        expect(history).toHaveLength(0)
        expect(ratings.size).toBe(0)
    })

    it('레이팅은 [1.0, 7.0] 경계를 벗어나지 않는다', () => {
        // 약자가 강자에게 반복 패배해도 하한 1.0 미만으로 내려가지 않는다.
        const matches: Match[] = Array.from({ length: 40 }, (_, i) =>
            singles(`m${i}`, 'WEAK', 'STRONG', 'team2', [
                { team1: 0, team2: 6 },
                { team1: 0, team2: 6 },
            ]),
        )
        const { ratings } = replayClubRatings(matches)
        expect(ratings.get('WEAK')!.rating).toBeGreaterThanOrEqual(1.0)
        expect(ratings.get('STRONG')!.rating).toBeLessThanOrEqual(7.0)
    })
})

describe('doubles — 팀 평균 적용', () => {
    it('복식은 팀 두 선수가 함께 변동한다', () => {
        const doublesMatch: Match = {
            id: 'm1',
            matchGameId: 'g1',
            roundId: 'r1',
            courtId: 'c1',
            timeSlotId: 't1',
            matchType: 'men_doubles',
            team1: ['A', 'B'],
            team2: ['C', 'D'],
            status: 'finished',
            result: {
                sets: [{ team1: 6, team2: 3 }, { team1: 6, team2: 4 }],
                winnerId: 'team1',
            },
        }
        const { ratings } = replayClubRatings([doublesMatch])
        // 동급 팀(모두 2.5)이라 A·B 동일 상승, C·D 동일 하락.
        expect(ratings.get('A')!.rating).toBeCloseTo(ratings.get('B')!.rating, 9)
        expect(ratings.get('C')!.rating).toBeCloseTo(ratings.get('D')!.rating, 9)
        expect(ratings.get('A')!.rating).toBeGreaterThan(2.5)
        expect(ratings.get('C')!.rating).toBeLessThan(2.5)
    })
})

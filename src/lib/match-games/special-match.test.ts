import { describe, it, expect } from 'vitest'
import { isCloseMatch, buildCrossPairH2H, isRivalPair, isRivalMatch, pairKey } from './special-match'
import type { Match } from '@/types'

// 테스트용 Match 헬퍼 (필수 필드만 채움).
function singles(id: string, p1: string, p2: string, winner: 'team1' | 'team2' | 'draw'): Match {
    return {
        id, matchGameId: 'g', roundId: 'r', courtId: 'c', timeSlotId: 't',
        matchType: 'singles', player1Id: p1, player2Id: p2,
        status: 'finished', result: { sets: [{ team1: winner === 'team1' ? 6 : 4, team2: winner === 'team2' ? 6 : 4 }], winnerId: winner },
    }
}

function doubles(id: string, t1: string[], t2: string[], winner: 'team1' | 'team2' | 'draw'): Match {
    return {
        id, matchGameId: 'g', roundId: 'r', courtId: 'c', timeSlotId: 't',
        matchType: 'men_doubles', team1: t1, team2: t2,
        status: 'finished', result: { sets: [{ team1: 6, team2: 4 }], winnerId: winner },
    }
}

const sc = (a: string, b: string) => [{ team1: a, team2: b }]

describe('isCloseMatch', () => {
    it('한 게임차(이긴측 ≥4)면 접전 (6-5·5-4·7-6·4-3)', () => {
        expect(isCloseMatch(sc('6', '5'), 'team1')).toBe(true)
        expect(isCloseMatch(sc('4', '5'), 'team2')).toBe(true)
        expect(isCloseMatch(sc('7', '6'), 'team1')).toBe(true)
        expect(isCloseMatch(sc('4', '3'), 'team1')).toBe(true)
    })
    it('두 게임차는 패측 ≥5일 때만 접전 (7-5 ○, 6-4 ×)', () => {
        expect(isCloseMatch(sc('7', '5'), 'team1')).toBe(true)
        expect(isCloseMatch(sc('6', '4'), 'team1')).toBe(false)
    })
    it('극소 점수(2-1·1-0)나 일방적 점수는 접전 아님', () => {
        expect(isCloseMatch(sc('2', '1'), 'team1')).toBe(false)
        expect(isCloseMatch(sc('1', '0'), 'team1')).toBe(false)
        expect(isCloseMatch(sc('6', '1'), 'team1')).toBe(false)
        expect(isCloseMatch(sc('6', '0'), 'team1')).toBe(false)
    })
    it('무승부·미입력은 접전 아님', () => {
        expect(isCloseMatch(sc('6', '6'), 'draw')).toBe(false)
        expect(isCloseMatch(sc('', ''), null)).toBe(false)
    })
})

describe('pairKey', () => {
    it('순서 무관 동일 키', () => {
        expect(pairKey('a', 'b')).toBe(pairKey('b', 'a'))
    })
})

describe('buildCrossPairH2H / isRivalPair', () => {
    it('단식 누적 전적을 cross-pair로 집계', () => {
        const matches = [
            singles('1', 'a', 'b', 'team1'),
            singles('2', 'b', 'a', 'team1'), // 이번엔 b가 team1으로 승 → a 기준 1승1패
            singles('3', 'a', 'b', 'team2'), // b 승 → a 1승2패
        ]
        const h2h = buildCrossPairH2H(matches)
        const rec = h2h.get(pairKey('a', 'b'))!
        expect(rec.aWins + rec.bWins).toBe(3)
        // 3경기·박빙(1승2패 → 33% 또는 2승1패 → 67%? a=1승2패 = 33%, 박빙 아님)
        expect(isRivalPair(rec)).toBe(false)
    })

    it('3경기·승률 50%면 라이벌', () => {
        const matches = [
            singles('1', 'a', 'b', 'team1'), // a승
            singles('2', 'a', 'b', 'team2'), // b승
            singles('3', 'a', 'b', 'team1'), // a승
            singles('4', 'a', 'b', 'team2'), // b승 → 2승2패 = 50%
        ]
        const rec = buildCrossPairH2H(matches).get(pairKey('a', 'b'))!
        expect(isRivalPair(rec)).toBe(true)
    })

    it('복식은 team1×team2 모든 cross 쌍에 승패 부여, 같은 팀은 제외', () => {
        const h2h = buildCrossPairH2H([doubles('1', ['a', 'b'], ['c', 'd'], 'team1')])
        expect(h2h.has(pairKey('a', 'c'))).toBe(true)
        expect(h2h.has(pairKey('a', 'd'))).toBe(true)
        expect(h2h.has(pairKey('b', 'c'))).toBe(true)
        expect(h2h.has(pairKey('b', 'd'))).toBe(true)
        expect(h2h.has(pairKey('a', 'b'))).toBe(false) // 같은 팀
    })

    it('2경기는 라이벌 아님(minGames 미달)', () => {
        const rec = buildCrossPairH2H([
            singles('1', 'a', 'b', 'team1'),
            singles('2', 'a', 'b', 'team2'),
        ]).get(pairKey('a', 'b'))!
        expect(isRivalPair(rec)).toBe(false)
    })
})

describe('isRivalMatch', () => {
    it('복식에서 cross 쌍 하나라도 라이벌이면 경기를 라이벌로 판정', () => {
        // a-c가 4경기 박빙 라이벌이 되도록 히스토리 구성
        const history = [
            singles('1', 'a', 'c', 'team1'),
            singles('2', 'a', 'c', 'team2'),
            singles('3', 'a', 'c', 'team1'),
            singles('4', 'a', 'c', 'team2'),
        ]
        const h2h = buildCrossPairH2H(history)
        // 현재 경기: a,b vs c,d → a-c 쌍이 라이벌
        expect(isRivalMatch(doubles('x', ['a', 'b'], ['c', 'd'], 'team1'), h2h)).toBe(true)
        // 라이벌 쌍이 같은 편이면 판정 안 됨
        expect(isRivalMatch(doubles('y', ['a', 'c'], ['e', 'f'], 'team1'), h2h)).toBe(false)
    })
})

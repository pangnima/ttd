import { describe, expect, it } from 'vitest'
import type { Match, PersonalMatch, User } from '@/types'
import {
    aggregateHeadToHeadUnified,
    summarizeHeadToHead,
    type UnifiedHeadToHeadDetail,
} from './head-to-head'

const ME = 'me'
const OPP = 'opp'
const MATE = 'mate'
const OPP2 = 'opp2'

function user(id: string, name: string, extra: Partial<User> = {}): User {
    return {
        id, email: `${id}@t.com`, name, nickname: name, role: 'member',
        phone: '', gender: 'male', dominantHand: 'right', ntrp: 3.5,
        tennisStartDate: '2020-01-01', createdAt: '2020-01-01',
        isGuest: false, statsHidden: false, ...extra,
    }
}

const userMap = new Map<string, User>([
    [ME, user(ME, '나')],
    [OPP, user(OPP, '상대', { personalNtrp: 4.0 })],
    [MATE, user(MATE, '내짝')],
    [OPP2, user(OPP2, '상대짝')],
])

function emptyBundle() {
    return {
        matches: [] as Match[],
        gameMetaById: {} as Record<string, { date: string }>,
        personalMatches: [] as PersonalMatch[],
        courtSurfaceByMatchId: {} as Record<string, never>,
    }
}

function clubSingles(id: string, winnerId: 'team1' | 'team2' | 'draw'): Match {
    return {
        id, matchGameId: id, roundId: 'r', courtId: 'c', timeSlotId: 't',
        matchType: 'singles', player1Id: ME, player2Id: OPP,
        status: 'finished', result: { sets: [{ team1: 6, team2: 4 }], winnerId },
    }
}

function clubDoubles(id: string, winnerId: 'team1' | 'team2' | 'draw'): Match {
    return {
        id, matchGameId: id, roundId: 'r', courtId: 'c', timeSlotId: 't',
        matchType: 'men_doubles', team1: [ME, MATE], team2: [OPP, OPP2],
        status: 'finished', result: { sets: [{ team1: 6, team2: 3 }], winnerId },
    }
}

describe('aggregateHeadToHeadUnified — 확장 필드', () => {
    it('클럽 단식: 매치타입·표면·승패 집계', () => {
        const bundle = {
            ...emptyBundle(),
            matches: [clubSingles('m1', 'team1')],
            gameMetaById: { m1: { date: '2026-06-01' } },
            courtSurfaceByMatchId: { m1: 'hard' as const },
        }
        const d = aggregateHeadToHeadUnified(bundle, ME, { userId: OPP, name: null }, userMap)
        expect(d.myWins).toBe(1)
        expect(d.matches[0].matchType).toBe('singles')
        expect(d.matches[0].surface).toBe('hard')
        expect(d.matches[0].myPartnerName).toBeNull()
        expect(d.byMatchType).toEqual([{ matchType: 'singles', wins: 1, losses: 0, draws: 0 }])
        expect(d.bySurface).toEqual([{ surface: 'hard', wins: 1, losses: 0, draws: 0 }])
    })

    it('클럽 복식: 내 파트너·상대 파트너 이름 해석', () => {
        const bundle = {
            ...emptyBundle(),
            matches: [clubDoubles('m1', 'team2')],
            gameMetaById: { m1: { date: '2026-06-01' } },
            courtSurfaceByMatchId: {} as Record<string, never>,
        }
        const d = aggregateHeadToHeadUnified(bundle, ME, { userId: OPP, name: null }, userMap)
        expect(d.myLosses).toBe(1)
        expect(d.matches[0].myPartnerName).toBe('내짝')
        expect(d.matches[0].opponentPartnerName).toBe('상대짝')
        expect(d.matches[0].surface).toBeNull()
        expect(d.bySurface).toEqual([{ surface: 'unknown', wins: 0, losses: 1, draws: 0 }])
    })

    it('회원 상대 NTRP는 유효 NTRP(personalNtrp 우선)로 보강', () => {
        const bundle = {
            ...emptyBundle(),
            matches: [clubSingles('m1', 'team1')],
            gameMetaById: { m1: { date: '2026-06-01' } },
        }
        const d = aggregateHeadToHeadUnified(bundle, ME, { userId: OPP, name: null }, userMap)
        expect(d.opponentNtrp).toBe(4.0)
    })

    it('개인 복식: 상대 슬롯2 선택 시 파트너=슬롯1, 손잡이/NTRP/시간/메모 채택', () => {
        const pm: PersonalMatch = {
            id: 'p1', userId: ME, opponentName: '상대A', partnerName: '내짝B',
            opponent2Name: '상대B', opponent2DominantHand: 'left', opponent2Ntrp: 3.0,
            playedAt: '2026-06-02', playedTime: '18:30', matchType: 'mixed_doubles',
            surface: 'clay', setScores: [{ me: 6, opp: 2 }], winner: 'me',
            notes: '비 오는 날', createdAt: '2026-06-02',
        }
        const bundle = { ...emptyBundle(), personalMatches: [pm] }
        const d = aggregateHeadToHeadUnified(bundle, ME, { userId: null, name: '상대B' }, userMap)
        expect(d.totalMatches).toBe(1)
        expect(d.matches[0].matchType).toBe('mixed_doubles')
        expect(d.matches[0].surface).toBe('clay')
        expect(d.matches[0].myPartnerName).toBe('내짝B')
        expect(d.matches[0].opponentPartnerName).toBe('상대A') // 슬롯1이 파트너
        expect(d.matches[0].playedTime).toBe('18:30')
        expect(d.matches[0].notes).toBe('비 오는 날')
        expect(d.opponentDominantHand).toBe('left')
        expect(d.opponentNtrp).toBe(3.0)
    })

    it('클럽+개인 통합 요약 분해 (매치타입별 경기수 내림차순)', () => {
        const pm: PersonalMatch = {
            id: 'p1', userId: ME, opponentUserId: OPP, opponentName: '상대',
            playedAt: '2026-06-03', matchType: 'singles',
            setScores: [{ me: 6, opp: 4 }], winner: 'opponent', createdAt: '2026-06-03',
        }
        const bundle = {
            ...emptyBundle(),
            matches: [clubDoubles('m1', 'team1'), clubSingles('m2', 'team1')],
            gameMetaById: { m1: { date: '2026-06-01' }, m2: { date: '2026-06-02' } },
            personalMatches: [pm],
        }
        const d = aggregateHeadToHeadUnified(bundle, ME, { userId: OPP, name: null }, userMap)
        // singles 2건(클럽1 + 개인1), men_doubles 1건 → 경기수 내림차순
        expect(d.totalMatches).toBe(3)
        expect(d.byMatchType[0].matchType).toBe('singles')
        expect(d.byMatchType[0]).toEqual({ matchType: 'singles', wins: 1, losses: 1, draws: 0 })
        expect(d.byMatchType[1]).toEqual({ matchType: 'men_doubles', wins: 1, losses: 0, draws: 0 })
    })
})

// summarizeHeadToHead 픽스처 — 필요한 필드만 채우고 나머지는 기본값
function detail(over: Partial<UnifiedHeadToHeadDetail>): UnifiedHeadToHeadDetail {
    return {
        key: 'k', opponentUserId: OPP, opponentName: '김철수',
        totalMatches: 0, myWins: 0, myLosses: 0, draws: 0, winRate: 0,
        mySetsWon: 0, mySetsLost: 0, last5: [], matches: [],
        byMatchType: [], bySurface: [],
        opponentDominantHand: null, opponentNtrp: null,
        ...over,
    }
}

describe('summarizeHeadToHead', () => {
    it('0경기 → 빈 배열', () => {
        expect(summarizeHeadToHead(detail({ totalMatches: 0 }), '김철수')).toEqual([])
    })

    it('우세 헤드라인', () => {
        const lines = summarizeHeadToHead(
            detail({ totalMatches: 10, myWins: 7, myLosses: 3, winRate: 70 }),
            '김철수',
        )
        expect(lines[0]).toBe('김철수 상대 7승 3패로 우세한 편이에요.')
    })

    it('열세 헤드라인', () => {
        const lines = summarizeHeadToHead(
            detail({ totalMatches: 10, myWins: 3, myLosses: 7, winRate: 30 }),
            '김철수',
        )
        expect(lines[0]).toBe('김철수 상대 3승 7패로 까다로운 상대예요.')
    })

    it('박빙 헤드라인', () => {
        const lines = summarizeHeadToHead(
            detail({ totalMatches: 10, myWins: 5, myLosses: 5, winRate: 50 }),
            '김철수',
        )
        expect(lines[0]).toContain('팽팽한 맞수')
    })

    it('연승 감지 (최신부터 W 연속, 무는 끊음)', () => {
        const matches = [
            { id: '1', date: '2026-06-05', outcome: 'W' as const, score: '', source: 'club' as const, matchType: 'singles' as const, surface: null, myPartnerName: null, opponentPartnerName: null, playedTime: null, notes: null },
            { id: '2', date: '2026-06-04', outcome: 'W' as const, score: '', source: 'club' as const, matchType: 'singles' as const, surface: null, myPartnerName: null, opponentPartnerName: null, playedTime: null, notes: null },
            { id: '3', date: '2026-06-03', outcome: 'L' as const, score: '', source: 'club' as const, matchType: 'singles' as const, surface: null, myPartnerName: null, opponentPartnerName: null, playedTime: null, notes: null },
        ]
        const lines = summarizeHeadToHead(
            detail({ totalMatches: 3, myWins: 2, myLosses: 1, winRate: 67, matches }),
            '김철수',
        )
        expect(lines).toContain('최근 2연승 중이에요.')
    })

    it('타입·표면 강약과 세트 득실 문장', () => {
        const lines = summarizeHeadToHead(
            detail({
                totalMatches: 6, myWins: 4, myLosses: 2, winRate: 67,
                mySetsWon: 10, mySetsLost: 4,
                byMatchType: [{ matchType: 'mixed_doubles', wins: 2, losses: 0, draws: 0 }],
                bySurface: [{ surface: 'clay', wins: 0, losses: 2, draws: 0 }],
            }),
            '김철수',
        )
        expect(lines.some((l) => l.includes('혼복에서 특히 강해요'))).toBe(true)
        expect(lines.some((l) => l.includes('클레이 코트에서 약세'))).toBe(true)
        expect(lines.some((l) => l.includes('세트 득실 +6'))).toBe(true)
        expect(lines.length).toBeLessThanOrEqual(4) // 최대 4줄 캡
    })
})

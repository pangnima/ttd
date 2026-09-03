// DB 재설계(Step2b) 임시 더미 데이터 — Supabase 연동 제거 스캐폴드 전용.
// 실제 스키마 재설계(Step3~4) 완료 후 이 파일은 제거하고 실 쿼리로 되돌린다.
import type {
    Club,
    ClubMember,
    ClubRating,
    Match,
    MatchGame,
    User,
} from '@/types'
import type { MatchGameRatingDeltas } from '@/lib/queries/ratings'

export const FIXTURE_CURRENT_USER_ID = 'u-owner'

const baseUser = (overrides: Partial<User> & Pick<User, 'id' | 'name' | 'nickname'>): User => ({
    email: `${overrides.id}@example.com`,
    role: 'member',
    phone: '010-0000-0000',
    gender: 'male',
    dominantHand: 'right',
    ntrp: 3.0,
    tennisStartDate: '2022-03-01',
    createdAt: '2024-01-01T00:00:00Z',
    isGuest: false,
    statsHidden: false,
    ...overrides,
})

export const FIXTURE_MEMBERS: User[] = [
    baseUser({ id: 'u-owner', name: '김도현', nickname: '도현', ntrp: 3.5, personalNtrp: 3.6 }),
    baseUser({ id: 'u-2', name: '이서준', nickname: '서준', ntrp: 3.0, dominantHand: 'left' }),
    baseUser({ id: 'u-3', name: '박지훈', nickname: '지훈', ntrp: 2.5, gender: 'male' }),
    baseUser({ id: 'u-4', name: '최민아', nickname: '민아', ntrp: 3.0, gender: 'female' }),
    baseUser({ id: 'u-5', name: '정하윤', nickname: '하윤', ntrp: 2.5, gender: 'female', dominantHand: 'left' }),
    baseUser({ id: 'u-6', name: '강태민', nickname: '태민', ntrp: 3.5 }),
    baseUser({ id: 'u-7', name: '윤소율', nickname: '소율', ntrp: 3.0, gender: 'female' }),
    baseUser({ id: 'u-8', name: '조현우', nickname: '현우', ntrp: 4.0, isGuest: true }),
]

export const FIXTURE_CLUB: Club = {
    id: 'c-1',
    name: '선릉 테니스 클럽',
    description: '평일 저녁·주말 오전 정기 모임',
    region: '서울 강남구',
    isPublic: true,
    memberCount: FIXTURE_MEMBERS.length,
    ownerId: FIXTURE_CURRENT_USER_ID,
    createdAt: '2023-05-01T00:00:00Z',
    courtSchedule: '매주 토 08:00-10:00 · 선릉코트 1~3',
}

export const FIXTURE_MEMBERSHIP: ClubMember = {
    userId: FIXTURE_CURRENT_USER_ID,
    clubId: FIXTURE_CLUB.id,
    role: 'owner',
    status: 'approved',
    joinedAt: '2023-05-01T00:00:00Z',
}

const scheduledMatchGameId = 'mg-scheduled'
const fixedMatchGameId = 'mg-fixed'

const scheduledMatches: Match[] = [
    {
        id: 'm-1',
        matchGameId: scheduledMatchGameId,
        roundId: 'r-1',
        courtId: 'ct-1',
        timeSlotId: 'ts-1',
        matchType: 'singles',
        player1Id: 'u-owner',
        player2Id: 'u-2',
        status: 'scheduled',
    },
    {
        id: 'm-2',
        matchGameId: scheduledMatchGameId,
        roundId: 'r-1',
        courtId: 'ct-2',
        timeSlotId: 'ts-1',
        matchType: 'mixed_doubles',
        team1: ['u-3', 'u-4'],
        team2: ['u-5', 'u-6'],
        team1AdPlayerId: 'u-4',
        team2AdPlayerId: undefined,
        status: 'scheduled',
    },
]

const fixedMatches: Match[] = [
    {
        id: 'm-3',
        matchGameId: fixedMatchGameId,
        roundId: 'r-2',
        courtId: 'ct-1',
        timeSlotId: 'ts-2',
        matchType: 'singles',
        player1Id: 'u-owner',
        player2Id: 'u-6',
        status: 'finished',
        result: { sets: [{ team1: 6, team2: 3 }, { team1: 6, team2: 4 }], winnerId: 'team1' },
    },
    {
        id: 'm-4',
        matchGameId: fixedMatchGameId,
        roundId: 'r-2',
        courtId: 'ct-2',
        timeSlotId: 'ts-2',
        matchType: 'women_doubles',
        team1: ['u-4', 'u-5'],
        team2: ['u-7', 'u-8'],
        status: 'finished',
        result: { sets: [{ team1: 4, team2: 6 }, { team1: 6, team2: 2 }, { team1: 10, team2: 8 }], winnerId: 'team1' },
    },
]

export const FIXTURE_MATCH_GAMES: MatchGame[] = [
    {
        id: scheduledMatchGameId,
        clubId: FIXTURE_CLUB.id,
        name: '4월 정기 대진표',
        date: '2025-04-12',
        courts: [
            { id: 'ct-1', label: '1코트', order: 1, surface: 'hard' },
            { id: 'ct-2', label: '2코트', order: 2, surface: 'hard' },
        ],
        rounds: [
            { id: 'r-1', label: '1st', order: 1, timeSlots: [{ id: 'ts-1', startAt: '08:05', endAt: '08:30' }] },
        ],
        matches: scheduledMatches,
        isFixed: false,
        createdAt: '2025-04-01T00:00:00Z',
    },
    {
        id: fixedMatchGameId,
        clubId: FIXTURE_CLUB.id,
        name: '3월 정기 대진표',
        date: '2025-03-08',
        courts: [
            { id: 'ct-1', label: '1코트', order: 1, surface: 'hard' },
            { id: 'ct-2', label: '2코트', order: 2, surface: 'clay' },
        ],
        rounds: [
            { id: 'r-2', label: '1st', order: 1, timeSlots: [{ id: 'ts-2', startAt: '08:05', endAt: '08:40' }] },
        ],
        matches: fixedMatches,
        isFixed: true,
        createdAt: '2025-03-01T00:00:00Z',
    },
]

export const FIXTURE_RATINGS: Record<string, ClubRating> = Object.fromEntries(
    FIXTURE_MEMBERS.map((m, i) => [m.id, { rating: 2.5 + i * 0.15, matchesPlayed: 4 + i }]),
)

export const FIXTURE_RATING_DELTAS: MatchGameRatingDeltas = {
    byMatch: {
        'm-3': {
            'u-owner': { before: 2.8, after: 2.95 },
            'u-6': { before: 3.1, after: 2.95 },
        },
        'm-4': {
            'u-4': { before: 2.6, after: 2.72 },
            'u-5': { before: 2.55, after: 2.67 },
            'u-7': { before: 2.9, after: 2.78 },
            'u-8': { before: 3.0, after: 2.88 },
        },
    },
    byUserTotal: [
        { userId: 'u-owner', before: 2.8, after: 2.95 },
        { userId: 'u-4', before: 2.6, after: 2.72 },
        { userId: 'u-5', before: 2.55, after: 2.67 },
        { userId: 'u-7', before: 2.9, after: 2.78 },
        { userId: 'u-8', before: 3.0, after: 2.88 },
        { userId: 'u-6', before: 3.1, after: 2.95 },
    ],
}

export function findFixtureMatchGame(matchGameId: string): MatchGame {
    return FIXTURE_MATCH_GAMES.find((mg) => mg.id === matchGameId) ?? FIXTURE_MATCH_GAMES[0]
}

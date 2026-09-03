// DB 재설계(Step2a) 임시 더미 데이터. Supabase 연동 제거 기간에만 사용.
// docs/redesign/ui-notes-clubs.md 참고. Step4에서 실제 스키마가 정해지면 제거된다.

import type { Club, ClubMember, User } from '@/types'
import type { MemberWithUser, ClubMemberCount } from '@/lib/queries/clubs'
import type { PendingMemberWithUser, ClubMatchGameActivity, ActivityRankingEntry, ClubWinRateRanking } from '@/lib/queries/club-dashboard'
import type { ClubRatingRankingEntry } from '@/lib/queries/ratings'
import type { ClubRating } from '@/types'
import type { ClubMemberForm } from '@/lib/analytics/club-form'

function dummyUser(id: string, name: string, overrides: Partial<User> = {}): User {
    return {
        id,
        email: `${id}@example.com`,
        name,
        nickname: name,
        role: 'member',
        phone: '010-1234-5678',
        gender: 'male',
        dominantHand: 'right',
        ntrp: 3.0,
        personalNtrp: 3.1,
        tennisStartDate: '2022-03-01',
        createdAt: '2024-01-01T00:00:00Z',
        isGuest: false,
        statsHidden: false,
        ...overrides,
    }
}

export const DUMMY_USERS: User[] = [
    dummyUser('u-owner', '박서준', { role: 'admin', ntrp: 3.5, personalNtrp: 3.6 }),
    dummyUser('u-officer', '김민지', { gender: 'female', ntrp: 3.0 }),
    dummyUser('u-member-1', '이도현', { ntrp: 2.5, personalNtrp: 2.7 }),
    dummyUser('u-member-2', '최유나', { gender: 'female', dominantHand: 'left', ntrp: 3.5 }),
    dummyUser('u-member-3', '정하윤', { ntrp: 4.0, personalNtrp: 3.9 }),
    dummyUser('u-guest-1', '게스트_강태오', { isGuest: true, ntrp: 2.0 }),
    dummyUser('u-pending-1', '신규희망_오세훈', { ntrp: 2.5 }),
]

export function getDummyClub(clubId: string): Club {
    return {
        id: clubId,
        name: '선릉 주말 테니스 클럽',
        description: '매주 토요일 오전 함께 즐겁게 치는 클럽입니다. 초보자 환영!',
        region: '서울 강남구',
        isPublic: true,
        memberCount: 24,
        ownerId: 'u-owner',
        createdAt: '2023-05-01T00:00:00Z',
        logoUrl: undefined,
        courtSchedule: '매주 토요일 07:00~09:00 · 양재시민의숲 테니스장',
    }
}

export function getDummyAllClubs(): Club[] {
    return [
        getDummyClub('club-1'),
        {
            ...getDummyClub('club-2'),
            id: 'club-2',
            name: '판교 나이트 테니스',
            description: '평일 저녁 야간 조명 코트에서 진행하는 소규모 클럽.',
            region: '경기 성남시',
            isPublic: false,
            memberCount: 12,
            courtSchedule: '매주 화/목 20:00~22:00',
        },
    ]
}

export function getDummyMemberCounts(clubIds: string[]): Map<string, ClubMemberCount> {
    const map = new Map<string, ClubMemberCount>()
    clubIds.forEach((id, i) => map.set(id, { regular: 20 + i, guest: 4 }))
    return map
}

export function getDummyMembershipMap(clubIds: string[]): Map<string, { status: ClubMember['status'], role: ClubMember['role'] }> {
    const map = new Map<string, { status: ClubMember['status'], role: ClubMember['role'] }>()
    if (clubIds[0]) map.set(clubIds[0], { status: 'approved', role: 'owner' })
    return map
}

export function getDummyMyMembership(): ClubMember {
    return { userId: 'u-owner', clubId: 'club-1', role: 'owner', status: 'approved', joinedAt: '2023-05-01T00:00:00Z' }
}

function toMember(
    user: User,
    role: ClubMember['role'],
    clubId: string,
    joinedAt: string,
    status: ClubMember['status'] = 'approved',
): MemberWithUser {
    return { userId: user.id, clubId, role, status, joinedAt, user }
}

export function getDummyPendingClubMembers(clubId: string): MemberWithUser[] {
    return [toMember(DUMMY_USERS[6], 'member', clubId, '2025-01-10T00:00:00Z', 'pending')]
}

export function getDummyApprovedMembers(clubId: string): MemberWithUser[] {
    return [
        toMember(DUMMY_USERS[0], 'owner', clubId, '2023-05-01T00:00:00Z'),
        toMember(DUMMY_USERS[1], 'officer', clubId, '2023-05-10T00:00:00Z'),
        toMember(DUMMY_USERS[2], 'member', clubId, '2023-06-01T00:00:00Z'),
        toMember(DUMMY_USERS[3], 'member', clubId, '2023-06-15T00:00:00Z'),
        toMember(DUMMY_USERS[4], 'member', clubId, '2023-07-01T00:00:00Z'),
        toMember(DUMMY_USERS[5], 'member', clubId, '2023-08-01T00:00:00Z'),
    ]
}

export function getDummyPendingMembers(clubId: string): PendingMemberWithUser[] {
    return [
        { userId: 'u-pending-1', clubId, joinedAt: '2025-01-10T00:00:00Z', user: DUMMY_USERS[6] },
    ]
}

export function getDummyClubPlayerRatings(): Record<string, ClubRating> {
    return {
        'u-owner': { rating: 3.6, matchesPlayed: 18 },
        'u-officer': { rating: 3.1, matchesPlayed: 12 },
        'u-member-1': { rating: 2.6, matchesPlayed: 6 },
        'u-member-2': { rating: 3.4, matchesPlayed: 9 },
        'u-member-3': { rating: 4.0, matchesPlayed: 22 },
    }
}

export function getDummyClubRatingRanking(): ClubRatingRankingEntry[] {
    return [
        { userId: 'u-member-3', user: DUMMY_USERS[4], rating: 4.0, matchesPlayed: 22 },
        { userId: 'u-owner', user: DUMMY_USERS[0], rating: 3.6, matchesPlayed: 18 },
        { userId: 'u-member-2', user: DUMMY_USERS[3], rating: 3.4, matchesPlayed: 9 },
        { userId: 'u-officer', user: DUMMY_USERS[1], rating: 3.1, matchesPlayed: 12 },
        { userId: 'u-member-1', user: DUMMY_USERS[2], rating: 2.6, matchesPlayed: 6 },
    ]
}

export function getDummyMemberForms(): Map<string, ClubMemberForm> {
    return new Map([
        ['u-member-3', { wins: 15, losses: 7, draws: 0, recent: ['W', 'W', 'L', 'W', 'W'] }],
        ['u-owner', { wins: 11, losses: 7, draws: 0, recent: ['L', 'W', 'W', 'L', 'W'] }],
        ['u-member-2', { wins: 5, losses: 4, draws: 0, recent: ['W', 'L', 'W', 'W', 'L'] }],
        ['u-officer', { wins: 6, losses: 6, draws: 0, recent: ['L', 'L', 'W', 'W', 'L'] }],
        ['u-member-1', { wins: 2, losses: 4, draws: 0, recent: ['L', 'W', 'L', 'L', 'W'] }],
    ])
}

export function getDummyMatchGameActivity(_clubId: string): ClubMatchGameActivity {
    return {
        recentGames: [
            { id: 'mg-3', name: '9월 3주차 대진표', date: '2025-09-20', isFixed: false },
            { id: 'mg-2', name: '9월 2주차 대진표', date: '2025-09-13', isFixed: true },
            { id: 'mg-1', name: '9월 1주차 대진표', date: '2025-09-06', isFixed: true },
        ],
        fixedCount: 8,
        pendingCount: 1,
        nextGame: { id: 'mg-3', name: '9월 3주차 대진표', date: '2025-09-20', isFixed: false },
        matchTypeCounts: { singles: 14, menDoubles: 20, womenDoubles: 4, mixedDoubles: 6 },
    }
}

function winRateEntry(user: User, matchCount: number, winCount: number): { userId: string, user: User, matchCount: number, winCount: number, lossCount: number, winRate: number } {
    return { userId: user.id, user, matchCount, winCount, lossCount: matchCount - winCount, winRate: Math.round((winCount / matchCount) * 1000) / 10 }
}

export function getDummyWinRateRanking(): ClubWinRateRanking {
    return {
        singles: [winRateEntry(DUMMY_USERS[4], 10, 8), winRateEntry(DUMMY_USERS[0], 9, 6)],
        menDoubles: [winRateEntry(DUMMY_USERS[0], 12, 9)],
        womenDoubles: [winRateEntry(DUMMY_USERS[3], 6, 4)],
        mixedDoubles: [winRateEntry(DUMMY_USERS[1], 5, 3)],
    }
}

export function getDummyActivityRanking(): ActivityRankingEntry[] {
    return [
        { userId: 'u-member-3', user: DUMMY_USERS[4], matchCount: 6, winCount: 4 },
        { userId: 'u-owner', user: DUMMY_USERS[0], matchCount: 5, winCount: 3 },
        { userId: 'u-member-2', user: DUMMY_USERS[3], matchCount: 3, winCount: 2 },
    ]
}

export function getDummyActiveInviteToken(): string | null {
    return 'dummy-invite-token-abc123'
}

export function getDummyInvitePreview(): { name: string, region: string | null, logo_url: string | null } {
    return { name: '선릉 주말 테니스 클럽', region: '서울 강남구', logo_url: null }
}

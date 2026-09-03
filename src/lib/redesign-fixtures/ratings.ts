// 재설계 Step2d 전용 더미 데이터. DB 재설계(club_player_ratings/club_rating_history 초기화) 전까지
// 클럽 레이팅/티어 화면을 DB 연동 없이 렌더링하기 위한 고정 픽스처.
// 타입은 기존 lib/queries/ratings.ts와 동일하게 맞춰, Step3 ERD 확정 후 실제 쿼리로 교체하기 쉽게 한다.
import type { User } from '@/types'
import type { ClubRating, ClubRatingRankingEntry, RatingHistoryPoint } from '@/lib/queries/ratings'

function dummyUser(id: string, name: string, ntrp: number, isGuest = false): User {
    return {
        id,
        email: `${id}@example.com`,
        name,
        nickname: name,
        role: 'member',
        phone: '010-0000-0000',
        gender: 'male',
        dominantHand: 'right',
        ntrp,
        personalNtrp: ntrp,
        tennisStartDate: '2022-01-01',
        createdAt: '2024-01-01T00:00:00.000Z',
        isGuest,
        statsHidden: false,
    }
}

const DUMMY_USERS: Array<{ id: string; name: string; ntrp: number; isGuest?: boolean }> = [
    { id: 'u-1', name: '김도윤', ntrp: 4.0 },
    { id: 'u-2', name: '이서준', ntrp: 3.5 },
    { id: 'u-3', name: '박지훈', ntrp: 3.5 },
    { id: 'u-4', name: '최민서', ntrp: 3.0 },
    { id: 'u-5', name: '정하늘(게스트)', ntrp: 2.5, isGuest: true },
]

export function dummyClubRatingRanking(): ClubRatingRankingEntry[] {
    const ratings = [4.2, 3.9, 3.6, 3.1, 2.6]
    return DUMMY_USERS.map((u, i) => ({
        userId: u.id,
        user: dummyUser(u.id, u.name, u.ntrp, u.isGuest),
        rating: ratings[i],
        matchesPlayed: 20 - i * 3,
    }))
}

export function dummyClubRatingHistory(): RatingHistoryPoint[] {
    const base = 2.5
    return Array.from({ length: 8 }, (_, i) => {
        const before = base + i * 0.08
        const delta = i % 3 === 1 ? -0.05 : 0.12
        return {
            createdAt: new Date(2025, 0, 1 + i * 7).toISOString(),
            ratingBefore: Number(before.toFixed(2)),
            ratingAfter: Number((before + delta).toFixed(2)),
            delta: Number(delta.toFixed(2)),
            matchId: `dummy-match-${i}`,
        }
    })
}

export function dummyUserClubRatings(clubIds: string[]): Record<string, ClubRating> {
    const result: Record<string, ClubRating> = {}
    clubIds.forEach((clubId, i) => {
        result[clubId] = { rating: 3.0 + (i % 3) * 0.4, matchesPlayed: 12 + i * 4 }
    })
    return result
}

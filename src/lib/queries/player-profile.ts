import { fetchMatchesByUser } from '@/lib/queries/match-games'
import {
    fetchUserMatchStatsV2,
    fetchUserDoublesCourtStats,
    fetchUserPartnerStats,
    fetchUserHeadToHead,
} from '@/lib/queries/stats'
import { fetchUsersByIds } from '@/lib/queries/users'
import type { User } from '@/types'

export type PlayerStatsBundle = {
    matches: Awaited<ReturnType<typeof fetchMatchesByUser>>['matches']
    gameMetaById: Awaited<ReturnType<typeof fetchMatchesByUser>>['gameMetaById']
    stats: Awaited<ReturnType<typeof fetchUserMatchStatsV2>>
    court: Awaited<ReturnType<typeof fetchUserDoublesCourtStats>>
    h2h: Awaited<ReturnType<typeof fetchUserHeadToHead>>
    partners: Awaited<ReturnType<typeof fetchUserPartnerStats>>
    userMap: Map<string, User>
}

// dashboard·profile 페이지에서 공통으로 사용하는 5종 병렬 페치 + userMap 구성.
export async function fetchPlayerStatsBundle(
    userId: string,
    clubId: string | undefined,
): Promise<PlayerStatsBundle> {
    const [{ matches, gameMetaById }, stats, court, h2h, partners] = await Promise.all([
        fetchMatchesByUser(userId, clubId),
        fetchUserMatchStatsV2(userId, clubId),
        fetchUserDoublesCourtStats(userId, clubId),
        fetchUserHeadToHead(userId, clubId),
        fetchUserPartnerStats(userId, clubId),
    ])

    const userIds = new Set<string>()
    for (const m of matches) {
        for (const id of [m.player1Id, m.player2Id, ...(m.team1 ?? []), ...(m.team2 ?? [])]) {
            if (id && id !== userId) userIds.add(id)
        }
    }
    for (const r of h2h) userIds.add(r.opponentId)
    for (const p of partners) userIds.add(p.partnerId)

    const allUsers = await fetchUsersByIds([...userIds])
    const userMap = new Map(allUsers.map((u) => [u.id, u]))

    return { matches, gameMetaById, stats, court, h2h, partners, userMap }
}

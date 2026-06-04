import 'server-only'

import { fetchMatchesByUser } from '@/lib/queries/match-games'
import {
    fetchUserMatchStatsV2,
    fetchUserDoublesCourtStats,
    fetchUserPartnerStats,
    fetchUserHeadToHead,
} from '@/lib/queries/stats'
import { buildUserMap, extractH2hIds, extractPartnerIds } from '@/lib/queries/_shared'
import type { User } from '@/types'

export type PlayerStatsBundle = {
    matches: Awaited<ReturnType<typeof fetchMatchesByUser>>['matches']
    gameMetaById: Awaited<ReturnType<typeof fetchMatchesByUser>>['gameMetaById']
    courtSurfaceByMatchId: Awaited<ReturnType<typeof fetchMatchesByUser>>['courtSurfaceByMatchId']
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
    const [{ matches, gameMetaById, courtSurfaceByMatchId }, stats, court, h2h, partners] = await Promise.all([
        fetchMatchesByUser(userId, clubId),
        fetchUserMatchStatsV2(userId, clubId),
        fetchUserDoublesCourtStats(userId, clubId),
        fetchUserHeadToHead(userId, clubId),
        fetchUserPartnerStats(userId, clubId),
    ])

    const userMap = await buildUserMap(
        matches,
        userId,
        [...extractH2hIds(h2h), ...extractPartnerIds(partners)],
    )

    return { matches, gameMetaById, courtSurfaceByMatchId, stats, court, h2h, partners, userMap }
}

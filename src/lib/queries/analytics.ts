import 'server-only'

import { fetchMatchesByUser } from '@/lib/queries/match-games'
import { fetchPersonalMatchesByUser } from '@/lib/queries/personal-matches'
import {
    fetchUserMatchStatsUnified,
    fetchUserHeadToHeadUnified,
    type UnifiedHeadToHead,
} from '@/lib/queries/stats'
import { buildUserMap, extractUnifiedH2hIds } from '@/lib/queries/_shared'
import type { Match, PersonalMatch, User } from '@/types'

export type AnalyticsMode = 'total' | 'personal'

export type AnalyticsOptions = {
    mode: AnalyticsMode
}

export type AnalyticsBundle = {
    stats: Awaited<ReturnType<typeof fetchUserMatchStatsUnified>>
    h2hList: UnifiedHeadToHead[]
    // 상세 H2H 패널용 클럽 매치 원본 (탭 무관하게 항상 전체)
    matches: Match[]
    gameMetaById: Awaited<ReturnType<typeof fetchMatchesByUser>>['gameMetaById']
    courtSurfaceByMatchId: Awaited<ReturnType<typeof fetchMatchesByUser>>['courtSurfaceByMatchId']
    // 상세 H2H 패널용 개인 매치 원본 (탭 무관하게 항상 전체)
    personalMatches: PersonalMatch[]
    userMap: Map<string, User>
}

export async function fetchAnalyticsBundle(userId: string, options: AnalyticsOptions): Promise<AnalyticsBundle> {
    const { mode } = options

    // stats는 탭 모드별 scope 적용 (전체 vs 개인만)
    // h2hList, matches, personalMatches는 항상 전체 통합 (탭과 무관)
    const scope = mode === 'personal' ? 'personal' : 'total'

    const [stats, h2hList, { matches, gameMetaById, courtSurfaceByMatchId }, personalMatches] = await Promise.all([
        fetchUserMatchStatsUnified(userId, scope),
        fetchUserHeadToHeadUnified(userId),
        fetchMatchesByUser(userId),
        fetchPersonalMatchesByUser(userId),
    ])

    // H2H 상세 패널에서 클럽 멤버 이름 표시용 userMap
    const userMap = await buildUserMap(matches, userId, extractUnifiedH2hIds(h2hList))

    return { stats, h2hList, matches, gameMetaById, courtSurfaceByMatchId, personalMatches, userMap }
}

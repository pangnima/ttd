import 'server-only'

import { fetchMatchesByUser } from '@/lib/queries/match-games'
import { fetchPersonalMatchesByUser } from '@/lib/queries/personal-matches'
import { buildUserMap, extractUnifiedH2hIds } from '@/lib/queries/_shared'
import { aggregateByMatchType } from '@/lib/analytics/match-type'
import { buildHeadToHeadList } from '@/lib/analytics/head-to-head'
import type { UnifiedHeadToHead } from '@/lib/queries/stats'
import type { PlayerStats } from '@/lib/stats'
import type { Match, PersonalMatch, User } from '@/types'

// ── scope 타입 ────────────────────────────────────────────────────────────

export type AnalyticsScope =
    | { kind: 'total' }
    | { kind: 'personal' }
    | { kind: 'club'; clubId: string; clubName: string }

export type AnalyticsOptions = {
    scope: AnalyticsScope
}

// ── 번들 타입 ─────────────────────────────────────────────────────────────

export type AnalyticsBundle = {
    stats: {
        singles: PlayerStats
        menDoubles: PlayerStats
        womenDoubles: PlayerStats
        mixedDoubles: PlayerStats
    }
    h2hList: UnifiedHeadToHead[]
    // 카드 집계용 원본 (scope 적용 완료 상태)
    matches: Match[]
    gameMetaById: Awaited<ReturnType<typeof fetchMatchesByUser>>['gameMetaById']
    courtSurfaceByMatchId: Awaited<ReturnType<typeof fetchMatchesByUser>>['courtSurfaceByMatchId']
    personalMatches: PersonalMatch[]
    userMap: Map<string, User>
}

// ── 헬퍼: WinLoss → PlayerStats 변환 ────────────────────────────────────

import type { WinLoss } from '@/lib/analytics/shared'

function wlToPlayerStats(wl: WinLoss): PlayerStats {
    return {
        wins: wl.wins,
        losses: wl.losses,
        draws: wl.draws,
        totalMatches: wl.total,
        winRate: wl.winRate,
        setsWon: 0,  // 본인 분석에서는 세트 숨김 처리 (showSets={false})
        setsLost: 0,
        byMatchType: [],
    }
}

// ── 번들 fetch ────────────────────────────────────────────────────────────

export async function fetchAnalyticsBundle(userId: string, options: AnalyticsOptions): Promise<AnalyticsBundle> {
    const { scope } = options

    // 전체 매치를 한 번 fetch 후 JS로 scope 필터
    const [{ matches: allMatches, gameMetaById, courtSurfaceByMatchId }, personalMatches] = await Promise.all([
        fetchMatchesByUser(userId),
        fetchPersonalMatchesByUser(userId),
    ])

    // scope 분기: club → 해당 클럽 매치만, personal → 개인 매치만, total → 모두
    let matches: Match[]
    let filteredPersonalMatches: PersonalMatch[]

    if (scope.kind === 'club') {
        matches = allMatches.filter((m) => gameMetaById[m.matchGameId]?.clubId === scope.clubId)
        filteredPersonalMatches = []
    } else if (scope.kind === 'personal') {
        matches = []
        filteredPersonalMatches = personalMatches
    } else {
        matches = allMatches
        filteredPersonalMatches = personalMatches
    }

    // 종합 통계: 순수함수 집계
    const matchTypeSummary = aggregateByMatchType(
        { matches, personalMatches: filteredPersonalMatches },
        userId,
    )
    const stats = {
        singles: wlToPlayerStats(matchTypeSummary.singles),
        menDoubles: wlToPlayerStats(matchTypeSummary.men_doubles),
        womenDoubles: wlToPlayerStats(matchTypeSummary.women_doubles),
        mixedDoubles: wlToPlayerStats(matchTypeSummary.mixed_doubles),
    }

    // H2H 목록: 순수함수 집계
    const h2hList = buildHeadToHeadList(
        { matches, gameMetaById, personalMatches: filteredPersonalMatches },
        userId,
    )

    // userMap: H2H 상대 + 매치 참가자 이름 표시용
    const opponentUserIds = extractUnifiedH2hIds(h2hList)
    const userMap = await buildUserMap(matches, userId, opponentUserIds)

    return {
        stats,
        h2hList,
        matches,
        gameMetaById,
        courtSurfaceByMatchId,
        personalMatches: filteredPersonalMatches,
        userMap,
    }
}

// 재설계 임시 픽스처 — /profile/[userId] 본인 통계의 fetchAnalyticsBundle 대체.
// 원본 PersonalMatch[]·userMap만 손으로 만들고 personalGames/stats/h2hList는 실 쿼리와 동일한
// 순수 함수로 파생한다. 값 import는 순수 모듈만(queries/analytics.ts는 server-only → 타입만).
// 실 Supabase 연동 복원 시 page.tsx 호출부를 fetchAnalyticsBundle로 되돌리고 이 파일을 제거한다.
import type { AnalyticsBundle, AnalyticsScope } from '@/lib/queries/analytics'
import type { User } from '@/types'
import { explodePersonalMatchSets } from '@/lib/personal-matches/explode'
import { aggregateByMatchType, toQuadStats } from '@/lib/analytics/match-type'
import { buildHeadToHeadList } from '@/lib/analytics/head-to-head'
import { formatUTC } from '@/lib/analytics/date-utils'
import type { FixtureScenario } from './_scenario'
import { buildDummyPersonalAnalyticsData } from './personal-analytics-data'

type Input = {
    userId: string
    gender: User['gender']
    scope: AnalyticsScope
    scenario: FixtureScenario
}

function emptyBundle(): AnalyticsBundle {
    return {
        stats: toQuadStats(aggregateByMatchType({ matches: [], personalMatches: [] }, '')),
        h2hList: [],
        matches: [],
        gameMetaById: {},
        courtSurfaceByMatchId: {},
        matchTimeById: {},
        personalMatches: [],
        personalGames: [],
        userMap: new Map(),
    }
}

/**
 * 개인 통계 번들 픽스처. 'empty' 시나리오와 클럽 scope(클럽 경기 픽스처는 범위 밖)는 빈 번들을 돌려
 * 기존 빈 상태 UI(ProfileEmptyGuide/StatsEmpty)가 그대로 동작하게 한다.
 * 날짜는 호출 시점의 오늘 기준으로 생성해 히트맵(28/182일 창)이 항상 채워진다.
 */
export function getDummyAnalyticsBundle({ userId, gender, scope, scenario }: Input): AnalyticsBundle {
    if (scenario === 'empty' || scope.kind === 'club') return emptyBundle()

    const { personalMatches, users } = buildDummyPersonalAnalyticsData({
        userId,
        gender,
        today: formatUTC(new Date()),
    })
    const personalGames = explodePersonalMatchSets(personalMatches)
    const stats = toQuadStats(aggregateByMatchType({ matches: [], personalMatches: personalGames }, userId))
    const h2hList = buildHeadToHeadList({ matches: [], gameMetaById: {}, personalMatches: personalGames }, userId)

    return {
        stats,
        h2hList,
        matches: [],
        gameMetaById: {},
        courtSurfaceByMatchId: {},
        matchTimeById: {},
        personalMatches,
        personalGames,
        userMap: new Map(users.map((u) => [u.id, u])),
    }
}

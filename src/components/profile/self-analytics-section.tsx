import { Suspense } from 'react'
import type { AnalyticsBundle, AnalyticsScope } from '@/lib/queries/analytics'
import type { User } from '@/types'
import { StatsQuadGrid } from '@/components/stats/stats-quad-grid'
import { HeadToHeadCard } from '@/components/stats/head-to-head-card'
import { RecentFormCard } from '@/components/stats/recent-form-card'
import { SurfaceStatsCard } from '@/components/stats/surface-stats-card'
import { NtrpDifferentialCard } from '@/components/stats/ntrp-differential-card'
import { StrengthWeaknessCard } from '@/components/stats/strength-weakness-card'
import { PersonalMatchesPreview } from '@/components/stats/personal-matches-preview'
import { AICoachingCard } from '@/components/stats/ai-coaching-card'
import { AnalyticsModeTabs } from '@/components/stats/analytics-mode-tabs'
import { PartnerRecommendationCard } from '@/components/stats/partner-recommendation-card'
import { aggregateBySurface } from '@/lib/analytics/surface'
import { aggregateRecentForm } from '@/lib/analytics/form'
import { aggregateByNtrpDiff } from '@/lib/analytics/ntrp'
import { diagnoseStrengthsWeaknesses } from '@/lib/analytics/diagnostics'
import { aggregatePartnerRecommendations } from '@/lib/analytics/partner'
import { fetchCachedAICoaching } from '@/lib/actions/ai-coaching'
import { SECTION_LABEL } from '@/lib/dashboard/tokens'

type Props = {
    bundle: AnalyticsBundle
    me: User
    scope: AnalyticsScope
    clubs: { id: string; name: string }[]
    /** 탭 전환 시 이동할 URL base (예: /profile/[userId]) */
    basePath: string
}

function getScopeLabel(scope: AnalyticsScope): string {
    if (scope.kind === 'personal') return '클럽 외 개인 경기 통계'
    if (scope.kind === 'club') return `${scope.clubName} 클럽 경기 통계`
    return '클럽 + 개인 경기 통합 통계'
}

/**
 * 본인 프로필에서만 보이는 개인 분석 풀버전 섹션.
 */
export async function SelfAnalyticsSection({ bundle, me, scope, clubs, basePath }: Props) {
    const surfaceStats = aggregateBySurface(
        {
            matches: bundle.matches,
            courtSurfaceByMatchId: bundle.courtSurfaceByMatchId,
            personalMatches: bundle.personalMatches,
        },
        me.id,
    )
    const recentForm = aggregateRecentForm(
        {
            matches: bundle.matches,
            gameMetaById: bundle.gameMetaById,
            personalMatches: bundle.personalMatches,
        },
        me.id,
    )
    const ntrpUserMap = new Map([...bundle.userMap.entries()].map(([id, u]) => [id, { ntrp: u.ntrp }]))
    const ntrpStats = aggregateByNtrpDiff(
        { matches: bundle.matches, userMap: ntrpUserMap },
        me.id,
        me.ntrp ?? null,
    )
    const diagnosis = diagnoseStrengthsWeaknesses(
        {
            matches: bundle.matches,
            gameMetaById: bundle.gameMetaById,
            personalMatches: bundle.personalMatches,
            courtSurfaceByMatchId: bundle.courtSurfaceByMatchId,
            userMap: ntrpUserMap,
        },
        me.id,
        me.ntrp ?? null,
    )

    const partnerRecommendations = aggregatePartnerRecommendations(
        { matches: bundle.matches },
        me.id,
    )

    const { result: aiResult, generatedAt: aiGeneratedAt } = await fetchCachedAICoaching(me.id)

    return (
        <div className="space-y-8">
            {/* 모드 탭 + 설명 */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <p className="text-sm text-foreground/60">{getScopeLabel(scope)}</p>
                <Suspense>
                    <AnalyticsModeTabs scope={scope} clubs={clubs} basePath={basePath} />
                </Suspense>
            </div>

            {/* 종합 통계 — 세트 표기 숨김 (심플하게) */}
            <section className="space-y-3">
                <p className={SECTION_LABEL}>종합 통계</p>
                <StatsQuadGrid
                    gender={me.gender}
                    singles={bundle.stats.singles}
                    menDoubles={bundle.stats.menDoubles}
                    womenDoubles={bundle.stats.womenDoubles}
                    mixedDoubles={bundle.stats.mixedDoubles}
                    privacy="public"
                    editable={false}
                    statsHidden={false}
                    showSets={false}
                />
            </section>

            {/* 최근 폼 + 코트 표면 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <RecentFormCard recentForm={recentForm} />
                <SurfaceStatsCard surfaceStats={surfaceStats} />
            </div>

            {/* 1:1 맞대결 비교 */}
            <Suspense>
                <HeadToHeadCard
                    h2hList={bundle.h2hList}
                    bundle={{
                        matches: bundle.matches,
                        gameMetaById: bundle.gameMetaById,
                        personalMatches: bundle.personalMatches,
                    }}
                    userId={me.id}
                    userMap={bundle.userMap}
                />
            </Suspense>

            {/* 나와 잘 맞는 파트너 추천 */}
            <PartnerRecommendationCard
                recommendations={partnerRecommendations}
                userMap={bundle.userMap}
                gender={me.gender}
            />

            {/* ── 심화 진단 (하단) ─────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <NtrpDifferentialCard ntrpStats={ntrpStats} />
                <StrengthWeaknessCard diagnosis={diagnosis} />
            </div>

            {/* AI 코칭 */}
            <AICoachingCard
                initialResult={aiResult}
                initialGeneratedAt={aiGeneratedAt}
            />

            {/* 개인 경기 미리보기 */}
            <PersonalMatchesPreview personalMatches={bundle.personalMatches} />
        </div>
    )
}

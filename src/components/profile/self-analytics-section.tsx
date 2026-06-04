import { Suspense } from 'react'
import type { AnalyticsBundle, AnalyticsMode } from '@/lib/queries/analytics'
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
import { aggregateBySurface } from '@/lib/analytics/surface'
import { aggregateRecentForm } from '@/lib/analytics/form'
import { aggregateByNtrpDiff } from '@/lib/analytics/ntrp'
import { diagnoseStrengthsWeaknesses } from '@/lib/analytics/diagnostics'
import { fetchCachedAICoaching } from '@/lib/actions/ai-coaching'
import { SECTION_LABEL } from '@/lib/dashboard/tokens'

type Props = {
    bundle: AnalyticsBundle
    me: User
    mode: AnalyticsMode
    /** 탭 전환 시 이동할 URL base (예: /profile/[userId]) */
    basePath: string
}

const MODE_LABEL: Record<AnalyticsMode, string> = {
    total: '클럽 + 개인 경기 통합 통계',
    personal: '클럽 외 개인 경기 통계',
}

/**
 * 본인 프로필에서만 보이는 개인 분석 풀버전 섹션.
 * /me/analytics 페이지의 컨텐츠를 흡수.
 */
export async function SelfAnalyticsSection({ bundle, me, mode, basePath }: Props) {
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

    const { result: aiResult, generatedAt: aiGeneratedAt } = await fetchCachedAICoaching(me.id)

    return (
        <div className="space-y-8">
            {/* 모드 탭 + 설명 */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <p className="text-sm text-foreground/60">{MODE_LABEL[mode]}</p>
                <Suspense>
                    <AnalyticsModeTabs mode={mode} basePath={basePath} />
                </Suspense>
            </div>

            {/* 종합 통계 */}
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
                />
            </section>

            {/* 심층 분석 카드 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <RecentFormCard recentForm={recentForm} />
                <SurfaceStatsCard surfaceStats={surfaceStats} />
                <NtrpDifferentialCard ntrpStats={ntrpStats} />
                <StrengthWeaknessCard diagnosis={diagnosis} />
            </div>

            {/* AI 코칭 */}
            <AICoachingCard
                initialResult={aiResult}
                initialGeneratedAt={aiGeneratedAt}
            />

            {/* 1:1 맞대결 */}
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

            {/* 개인 경기 미리보기 */}
            <PersonalMatchesPreview personalMatches={bundle.personalMatches} />
        </div>
    )
}

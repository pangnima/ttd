import { Suspense } from 'react'
import type { AnalyticsBundle, AnalyticsScope } from '@/lib/queries/analytics'
import type { User } from '@/types'
import { StatsQuadGrid } from '@/components/stats/stats-quad-grid'
import { StatsPrivacyToggle } from '@/components/stats/stats-privacy-toggle'
import { HeadToHeadCard } from '@/components/stats/head-to-head-card'
import { SurfaceStatsCard } from '@/components/stats/surface-stats-card'
import { NtrpDifferentialCard } from '@/components/stats/ntrp-differential-card'
import { StrengthWeaknessCard } from '@/components/stats/strength-weakness-card'
import { PersonalMatchesPreview } from '@/components/stats/personal-matches-preview'
import { AICoachingCard } from '@/components/stats/ai-coaching-card'
import { ClubRatingTrendCard } from '@/components/stats/club-rating-trend-card'
import { PersonalRatingTrendCard } from '@/components/stats/personal-rating-trend-card'
import { WinRateTrendCard } from '@/components/stats/win-rate-trend-card'
import { ActivityHourHeatmapCard } from '@/components/stats/activity-hour-heatmap-card'
import { RivalAnalysisCard } from '@/components/stats/rival-analysis-card'
import { PartnerChemistryCard } from '@/components/stats/partner-chemistry-card'
import { OpponentHandStatsCard } from '@/components/stats/opponent-hand-stats-card'
import { DoublesCourtStatsCard } from '@/components/stats/doubles-court-stats'
import { aggregateBySurface } from '@/lib/analytics/surface'
import { aggregateByDoublesCourtSide } from '@/lib/analytics/doubles-court'
import { aggregateByNtrpDiff } from '@/lib/analytics/ntrp'
import { aggregateByOpponentHand } from '@/lib/analytics/opponent-hand'
import { diagnoseStrengthsWeaknesses } from '@/lib/analytics/diagnostics'
import {
    listMatchYears,
    aggregateWeekdayStats,
    aggregateWeekOfYearStats,
    aggregateMonthOfYearStats,
} from '@/lib/analytics/trend-stats'
import { aggregateHourHeatmap } from '@/lib/analytics/hour-heatmap'
import { selectRivals } from '@/lib/analytics/rival'
import { aggregatePartnerChemistry } from '@/lib/analytics/partner-chemistry'
import { replayPersonalRatings } from '@/lib/rating/personal-rating'
import { effectiveNtrp } from '@/lib/rating/display'
import { fetchCachedAICoaching } from '@/lib/actions/ai-coaching'
import { SECTION_LABEL, PILL_BASE } from '@/lib/dashboard/tokens'
import type { RatingHistoryPoint } from '@/lib/queries/ratings'

type Props = {
    bundle: AnalyticsBundle
    me: User
    scope: AnalyticsScope
    ratingHistory?: RatingHistoryPoint[]
}

function getScopeLabel(scope: AnalyticsScope): string {
    if (scope.kind === 'personal') return '클럽 외 개인 경기 통계'
    if (scope.kind === 'club') return `${scope.clubName} 경기 통계`
    return '클럽 + 개인 경기 통합 통계'
}

/**
 * 본인 프로필에서만 보이는 개인 분석 풀버전 섹션.
 */
export async function SelfAnalyticsSection({ bundle, me, scope, ratingHistory }: Props) {
    // 시간순/날짜 집계가 공유하는 번들 부분(클럽 매치 날짜는 gameMetaById에서 해석).
    // 개인 경기는 통계용 분해본(세트 1개 = 게임 1개)을 사용한다.
    const timeBundle = {
        matches: bundle.matches,
        gameMetaById: bundle.gameMetaById,
        personalMatches: bundle.personalGames,
    }

    const surfaceStats = aggregateBySurface(
        {
            matches: bundle.matches,
            courtSurfaceByMatchId: bundle.courtSurfaceByMatchId,
            personalMatches: bundle.personalGames,
        },
        me.id,
    )
    // NTRP 차이 분석은 진화 NTRP(personalNtrp 우선) 기준 — 실제 실력 대비 성적.
    const ntrpUserMap = new Map([...bundle.userMap.entries()].map(([id, u]) => [id, { ntrp: effectiveNtrp(u) }]))
    const myEffectiveNtrp = effectiveNtrp(me) || null
    const ntrpStats = aggregateByNtrpDiff(
        { matches: bundle.matches, userMap: ntrpUserMap },
        me.id,
        myEffectiveNtrp,
    )
    const diagnosis = diagnoseStrengthsWeaknesses(
        {
            matches: bundle.matches,
            gameMetaById: bundle.gameMetaById,
            personalMatches: bundle.personalGames,
            courtSurfaceByMatchId: bundle.courtSurfaceByMatchId,
            userMap: ntrpUserMap,
        },
        me.id,
        myEffectiveNtrp,
    )

    const opponentHandStats = aggregateByOpponentHand(
        { matches: bundle.matches, personalMatches: bundle.personalGames, userMap: bundle.userMap },
        me.id,
    )

    const doublesCourtStats = aggregateByDoublesCourtSide(
        { matches: bundle.matches, personalMatches: bundle.personalGames },
        me.id,
    )

    // ── 고도화 집계 ───────────────────────────────────────────
    const today = new Date().toISOString().slice(0, 10)
    const trendYears = listMatchYears(timeBundle, me.id).map((year) => ({
        year,
        daily: aggregateWeekdayStats(timeBundle, me.id, year),
        weekly: aggregateWeekOfYearStats(timeBundle, me.id, year),
        monthly: aggregateMonthOfYearStats(timeBundle, me.id, year),
    }))
    const hourBundle = { ...timeBundle, matchTimeById: bundle.matchTimeById }
    const weeklyHeatmap = aggregateHourHeatmap(hourBundle, today, 28)   // 최근 4주
    const monthlyHeatmap = aggregateHourHeatmap(hourBundle, today, 182) // 최근 약 6개월
    const rivals = selectRivals(timeBundle, me.id, bundle.h2hList)
    const chemistry = aggregatePartnerChemistry(timeBundle, me.id, me.gender)

    // 개인 경기 승패 기반 개인 레이팅 (온더플라이). 개인 scope 전용 지표 —
    // 통합 scope는 승무패가 클럽+개인 합산이라 모집단이 어긋나므로 계산/노출하지 않는다.
    const personalRating = scope.kind === 'personal'
        ? replayPersonalRatings(bundle.personalGames, me.ntrp ?? null, (id) => bundle.userMap.get(id)?.ntrp)
        : null

    const { result: aiResult, generatedAt: aiGeneratedAt } = await fetchCachedAICoaching(me.id)

    return (
        <div className="space-y-8">
            {/* 전적 통계 (4칸) — 세트 표기 숨김(심플), scope는 칩으로 노출 */}
            <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <p className={`${SECTION_LABEL} shrink-0`}>전적 통계</p>
                        <span className={`${PILL_BASE} text-primary border-primary/30 bg-primary/10 font-medium`}>
                            {getScopeLabel(scope)}
                        </span>
                    </div>
                    <div className="ml-auto">
                        <StatsPrivacyToggle hidden={me.statsHidden} />
                    </div>
                </div>
                <StatsQuadGrid
                    gender={me.gender}
                    singles={bundle.stats.singles}
                    menDoubles={bundle.stats.menDoubles}
                    womenDoubles={bundle.stats.womenDoubles}
                    mixedDoubles={bundle.stats.mixedDoubles}
                    privacy={me.statsHidden ? 'self' : 'public'}
                    showSets={false}
                />
            </section>

            {/* 내 승률 추이 + 경기 활동 히트맵 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <WinRateTrendCard years={trendYears} />
                <ActivityHourHeatmapCard weekly={weeklyHeatmap} monthly={monthlyHeatmap} />
            </div>

            {/* 진단성 카드 4종 (라이벌 · 파트너 · NTRP 대비 · 강점약점) — 1행 4칸 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
                <RivalAnalysisCard rivals={rivals} userMap={bundle.userMap} today={today} />
                <PartnerChemistryCard partners={chemistry} userMap={bundle.userMap} />
                <NtrpDifferentialCard ntrpStats={ntrpStats} />
                <StrengthWeaknessCard diagnosis={diagnosis} />
            </div>

            {/* 개인 경기 기록(좌 50%) + 코트 표면·손잡이 세로 스택(우 50%) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <PersonalMatchesPreview personalMatches={bundle.personalMatches} />
                <div className="space-y-6">
                    <SurfaceStatsCard surfaceStats={surfaceStats} />
                    <OpponentHandStatsCard handStats={opponentHandStats} />
                    <DoublesCourtStatsCard court={doublesCourtStats} />
                </div>
            </div>

            {/* 클럽 레이팅 추세 (클럽 scope 전용) */}
            {scope.kind === 'club' && ratingHistory && ratingHistory.length > 0 && (
                <ClubRatingTrendCard points={ratingHistory} clubName={scope.clubName} />
            )}

            {/* 개인 레이팅 추세 (개인 scope — 개인 경기가 있을 때) */}
            {personalRating && personalRating.history.length > 0 && (
                <PersonalRatingTrendCard
                    points={personalRating.history}
                    provisional={personalRating.provisional}
                />
            )}

            {/* 1:1 맞대결 비교 (full) */}
            <Suspense>
                <HeadToHeadCard
                    h2hList={bundle.h2hList}
                    bundle={{
                        matches: bundle.matches,
                        gameMetaById: bundle.gameMetaById,
                        personalMatches: bundle.personalGames,
                    }}
                    userId={me.id}
                    userMap={bundle.userMap}
                />
            </Suspense>

            {/* AI 코칭 (full) */}
            <AICoachingCard
                initialResult={aiResult}
                initialGeneratedAt={aiGeneratedAt}
            />
        </div>
    )
}

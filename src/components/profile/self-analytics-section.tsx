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
import { StatRankingCard, type StatRankingEntry } from '@/components/stats/stat-ranking-card'
import { ClubRatingTrendCard } from '@/components/stats/club-rating-trend-card'
import { aggregateBySurface } from '@/lib/analytics/surface'
import { aggregateRecentForm } from '@/lib/analytics/form'
import { aggregateByNtrpDiff } from '@/lib/analytics/ntrp'
import { aggregateByOpponentHand } from '@/lib/analytics/opponent-hand'
import { diagnoseStrengthsWeaknesses } from '@/lib/analytics/diagnostics'
import {
    aggregatePartnerRecommendations, flattenPartnersByGender,
    selectGoodPartners, selectLowWinRatePartners, type PartnerRec,
} from '@/lib/analytics/partner'
import {
    selectStrongOpponents, selectWeakOpponents, type OpponentRec,
} from '@/lib/analytics/head-to-head'
import { OpponentHandStatsCard } from '@/components/stats/opponent-hand-stats-card'
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

// StatRankingCard 엔트리 매핑 (회원은 id, 외부는 `name:{이름}` 키로 통일)
function partnerToEntry(r: PartnerRec): StatRankingEntry {
    return { key: r.partnerId, fallbackName: r.partnerName, wins: r.wins, losses: r.losses, draws: r.draws, winRate: r.winRate }
}

function opponentToEntry(o: OpponentRec): StatRankingEntry {
    return {
        key: o.opponentUserId ?? `name:${o.opponentName}`,
        fallbackName: o.opponentName ?? undefined,
        wins: o.wins, losses: o.losses, draws: o.draws, winRate: o.winRate,
    }
}

/**
 * 본인 프로필에서만 보이는 개인 분석 풀버전 섹션.
 */
export async function SelfAnalyticsSection({ bundle, me, scope, ratingHistory }: Props) {
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

    const partners = flattenPartnersByGender(
        aggregatePartnerRecommendations(
            { matches: bundle.matches, personalMatches: bundle.personalMatches },
            me.id,
        ),
        me.gender,
    )
    const goodPartnerEntries = selectGoodPartners(partners).map(partnerToEntry)
    const lowPartnerEntries = selectLowWinRatePartners(partners).map(partnerToEntry)
    const strongOpponentEntries = selectStrongOpponents(bundle.h2hList).map(opponentToEntry)
    const weakOpponentEntries = selectWeakOpponents(bundle.h2hList).map(opponentToEntry)

    const opponentHandStats = aggregateByOpponentHand(
        { personalMatches: bundle.personalMatches, userMap: bundle.userMap },
    )

    const { result: aiResult, generatedAt: aiGeneratedAt } = await fetchCachedAICoaching(me.id)

    return (
        <div className="space-y-8">
            {/* 전적 통계 (4칸) — 세트 표기 숨김(심플), scope는 칩으로 노출 */}
            <section className="space-y-3">
                <div className="flex items-center gap-2">
                    <p className={SECTION_LABEL}>전적 통계</p>
                    <span className={`${PILL_BASE} text-primary border-primary/30 bg-primary/10 font-medium`}>
                        {getScopeLabel(scope)}
                    </span>
                </div>
                <StatsQuadGrid
                    gender={me.gender}
                    singles={bundle.stats.singles}
                    menDoubles={bundle.stats.menDoubles}
                    womenDoubles={bundle.stats.womenDoubles}
                    mixedDoubles={bundle.stats.mixedDoubles}
                    privacy={me.statsHidden ? 'self' : 'public'}
                    editable={true}
                    statsHidden={me.statsHidden}
                    showSets={false}
                />
            </section>

            {/* 최근 폼 + 코트 표면 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <RecentFormCard recentForm={recentForm} />
                <SurfaceStatsCard surfaceStats={surfaceStats} />
            </div>

            {/* 잘 맞는 파트너 · 승률 낮은 파트너 · 강한 상대 · 약한 상대 (4col) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatRankingCard
                    title="나와 잘 맞는 파트너"
                    entries={goodPartnerEntries}
                    userMap={bundle.userMap}
                    emptyText="5경기 이상 함께 뛰고 승률 55% 이상인 파트너가 아직 없어요"
                />
                <StatRankingCard
                    title="승률이 낮은 파트너"
                    entries={lowPartnerEntries}
                    userMap={bundle.userMap}
                    emptyText="5경기 이상 함께 뛴 파트너 중 승률 40% 미만이 없어요"
                />
                <StatRankingCard
                    title="내가 강한 상대"
                    entries={strongOpponentEntries}
                    userMap={bundle.userMap}
                    emptyText="10경기 이상 맞붙어 승률 60% 이상인 상대가 아직 없어요"
                />
                <StatRankingCard
                    title="내가 약한 상대"
                    entries={weakOpponentEntries}
                    userMap={bundle.userMap}
                    emptyText="10경기 이상 맞붙고 승률 40% 미만인 상대가 아직 없어요"
                />
            </div>

            {/* 개인 경기 기록 (full) — 파트너/상대 행 하단으로 이동 */}
            <PersonalMatchesPreview personalMatches={bundle.personalMatches} />

            {/* ── 심화 진단 (3col) ─────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <NtrpDifferentialCard ntrpStats={ntrpStats} />
                <StrengthWeaknessCard diagnosis={diagnosis} />
                <OpponentHandStatsCard handStats={opponentHandStats} />
            </div>

            {/* 클럽 레이팅 추세 (클럽 scope에서만) — 1:1 맞대결 바로 위 */}
            {scope.kind === 'club' && ratingHistory && ratingHistory.length > 0 && (
                <ClubRatingTrendCard points={ratingHistory} clubName={scope.clubName} />
            )}

            {/* 1:1 맞대결 비교 (full) */}
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

            {/* AI 코칭 (full) */}
            <AICoachingCard
                initialResult={aiResult}
                initialGeneratedAt={aiGeneratedAt}
            />
        </div>
    )
}

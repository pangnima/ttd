import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchUserById } from '@/lib/queries/users'
import { fetchAnalyticsBundle, type AnalyticsMode } from '@/lib/queries/analytics'
import { StatsQuadGrid } from '@/components/dashboard/stats-quad-grid'
import { HeadToHeadCard } from '@/components/analytics/head-to-head-card'
import { AnalyticsModeTabs } from '@/components/analytics/analytics-mode-tabs'
import { SurfaceStatsCard } from '@/components/analytics/surface-stats-card'
import { RecentFormCard } from '@/components/analytics/recent-form-card'
import { StrengthWeaknessCard } from '@/components/analytics/strength-weakness-card'
import { NtrpDifferentialCard } from '@/components/analytics/ntrp-differential-card'
import { PersonalMatchesPreview } from '@/components/analytics/personal-matches-preview'
import { aggregateBySurface } from '@/lib/analytics/surface'
import { aggregateRecentForm } from '@/lib/analytics/form'
import { aggregateByNtrpDiff } from '@/lib/analytics/ntrp'
import { diagnoseStrengthsWeaknesses } from '@/lib/analytics/diagnostics'
import { SECTION_LABEL } from '@/lib/dashboard/tokens'

export const metadata = { title: '개인 분석' }

type Props = {
    searchParams: Promise<{ mode?: string }>
}

const VALID_MODES: AnalyticsMode[] = ['total', 'personal']

export default async function AnalyticsPage({ searchParams }: Props) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const me = await fetchUserById(user.id)
    if (!me) redirect('/login')

    const { mode: modeParam } = await searchParams
    const mode: AnalyticsMode = VALID_MODES.includes(modeParam as AnalyticsMode)
        ? (modeParam as AnalyticsMode)
        : 'total'

    const bundle = await fetchAnalyticsBundle(user.id, { mode })

    const modeLabel: Record<AnalyticsMode, string> = {
        total: '클럽 + 개인 경기 통합 통계',
        personal: '클럽 외 개인 경기 통계',
    }

    // 집계 함수는 서버에서 직접 실행 (클라이언트 전달 불필요)
    const surfaceStats = aggregateBySurface(
        { matches: bundle.matches, courtSurfaceByMatchId: bundle.courtSurfaceByMatchId, personalMatches: bundle.personalMatches },
        user.id,
    )
    const recentForm = aggregateRecentForm(
        { matches: bundle.matches, gameMetaById: bundle.gameMetaById, personalMatches: bundle.personalMatches },
        user.id,
    )
    // userMap을 ntrp 조회용으로 변환
    const ntrpUserMap = new Map([...bundle.userMap.entries()].map(([id, u]) => [id, { ntrp: u.ntrp }]))
    const ntrpStats = aggregateByNtrpDiff(
        { matches: bundle.matches, userMap: ntrpUserMap },
        user.id,
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
        user.id,
        me.ntrp ?? null,
    )

    return (
        <div className="space-y-8">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className={`${SECTION_LABEL} text-2xl`}>개인 분석</h1>
                    <p className="text-sm text-foreground/60 mt-1">{modeLabel[mode]}</p>
                </div>
                <Suspense>
                    <AnalyticsModeTabs mode={mode} />
                </Suspense>
            </div>

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <RecentFormCard recentForm={recentForm} />
                <SurfaceStatsCard surfaceStats={surfaceStats} />
                <NtrpDifferentialCard ntrpStats={ntrpStats} />
                <StrengthWeaknessCard diagnosis={diagnosis} />
            </div>

            <Suspense>
                <HeadToHeadCard
                    h2hList={bundle.h2hList}
                    bundle={{ matches: bundle.matches, gameMetaById: bundle.gameMetaById, personalMatches: bundle.personalMatches }}
                    userId={user.id}
                    userMap={bundle.userMap}
                />
            </Suspense>

            <PersonalMatchesPreview personalMatches={bundle.personalMatches} />
        </div>
    )
}

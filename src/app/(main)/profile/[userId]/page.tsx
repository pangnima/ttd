import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchUserById } from '@/lib/queries/users'
import { fetchClubById } from '@/lib/queries/clubs'
import { fetchPlayerStatsBundle } from '@/lib/queries/player-profile'
import { fetchAnalyticsBundle, type AnalyticsMode } from '@/lib/queries/analytics'
import { MemberProfileHeader } from '@/components/profile/member-profile-header'
import { PlayerStatsSection } from '@/components/profile/player-stats-section'
import { SelfAnalyticsSection } from '@/components/profile/self-analytics-section'
import { SECTION_LABEL } from '@/lib/dashboard/tokens'

type Props = {
    params: Promise<{ userId: string }>
    searchParams: Promise<{ clubId?: string; mode?: string }>
}

const VALID_MODES: AnalyticsMode[] = ['total', 'personal']

export default async function MemberProfilePage({ params, searchParams }: Props) {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) redirect('/login')

    const { userId } = await params
    const { clubId, mode: modeParam } = await searchParams

    const [target, club] = await Promise.all([
        fetchUserById(userId),
        clubId ? fetchClubById(clubId) : Promise.resolve(null),
    ])
    if (!target) notFound()

    const isSelf = authUser.id === userId

    if (isSelf) {
        // 본인 프로필: 개인 분석 풀버전 렌더
        const mode: AnalyticsMode = VALID_MODES.includes(modeParam as AnalyticsMode)
            ? (modeParam as AnalyticsMode)
            : 'total'

        const bundle = await fetchAnalyticsBundle(userId, { mode })

        return (
            <div className="space-y-6">
                <MemberProfileHeader user={target} clubName={club?.name} />
                <div>
                    <h2 className={`${SECTION_LABEL} mb-6`}>나의 분석</h2>
                    <SelfAnalyticsSection
                        bundle={bundle}
                        me={target}
                        mode={mode}
                        basePath={`/profile/${userId}`}
                    />
                </div>
            </div>
        )
    }

    // 타인 프로필: 공개 요약 통계
    const privacy = target.statsHidden ? 'locked' : 'public'
    const bundle = await fetchPlayerStatsBundle(userId, clubId)

    return (
        <div className="space-y-6">
            <MemberProfileHeader user={target} clubName={club?.name} />
            <PlayerStatsSection
                bundle={bundle}
                gender={target.gender}
                userId={target.id}
                privacy={privacy}
                editable={false}
                statsHidden={target.statsHidden}
            />
        </div>
    )
}

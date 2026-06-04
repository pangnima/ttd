import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchUserById } from '@/lib/queries/users'
import { fetchClubById, fetchMyClubs } from '@/lib/queries/clubs'
import { fetchPlayerStatsBundle } from '@/lib/queries/player-profile'
import { fetchAnalyticsBundle, type AnalyticsScope } from '@/lib/queries/analytics'
import { MemberProfileHeader } from '@/components/profile/member-profile-header'
import { PlayerStatsSection } from '@/components/profile/player-stats-section'
import { SelfAnalyticsSection } from '@/components/profile/self-analytics-section'
import { SECTION_LABEL } from '@/lib/dashboard/tokens'

type Props = {
    params: Promise<{ userId: string }>
    searchParams: Promise<{ clubId?: string; scope?: string }>
}

export default async function MemberProfilePage({ params, searchParams }: Props) {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) redirect('/login')

    const { userId } = await params
    const { clubId, scope: scopeParam } = await searchParams

    const [target, club] = await Promise.all([
        fetchUserById(userId),
        clubId ? fetchClubById(clubId) : Promise.resolve(null),
    ])
    if (!target) notFound()

    const isSelf = authUser.id === userId

    if (isSelf) {
        // 가입 클럽 목록 로드 (scope 탭 + 클럽 ID 검증에 사용)
        const myClubs = await fetchMyClubs(userId)

        // scope 결정: personal | <clubId>(가입 클럽 중 일치) | total(기본)
        const matchedClub = myClubs.find((c) => c.id === scopeParam)
        const scope: AnalyticsScope = matchedClub
            ? { kind: 'club', clubId: matchedClub.id, clubName: matchedClub.name }
            : scopeParam === 'personal'
            ? { kind: 'personal' }
            : { kind: 'total' }

        const bundle = await fetchAnalyticsBundle(userId, { scope })

        // 탭 렌더용 간략 클럽 목록
        const clubsForTab = myClubs.map((c) => ({ id: c.id, name: c.name }))

        return (
            <div className="space-y-6">
                <MemberProfileHeader user={target} clubName={club?.name} />
                <div>
                    <h2 className={`${SECTION_LABEL} mb-6`}>나의 분석</h2>
                    <SelfAnalyticsSection
                        bundle={bundle}
                        me={target}
                        scope={scope}
                        clubs={clubsForTab}
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

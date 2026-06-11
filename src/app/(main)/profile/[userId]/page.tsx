import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchUserById } from '@/lib/queries/users'
import { fetchClubById, fetchMyClubs } from '@/lib/queries/clubs'
import { fetchAnalyticsBundle, type AnalyticsScope } from '@/lib/queries/analytics'
import { fetchPlayerStatsBundle } from '@/lib/queries/player-profile'
import { fetchClubRatingHistory, type RatingHistoryPoint } from '@/lib/queries/ratings'
import { isProvisional } from '@/lib/rating/display'
import { MemberProfileHeader } from '@/components/profile/member-profile-header'
import { PlayerStatsSection } from '@/components/profile/player-stats-section'
import { SelfAnalyticsSection } from '@/components/profile/self-analytics-section'
import { AnalyticsModeTabs } from '@/components/stats/analytics-mode-tabs'
import { PageContainer } from '@/components/common/page-container'

type Props = {
    params: Promise<{ userId: string }>
    searchParams: Promise<{ clubId?: string; scope?: string }>
}

// 추세 이력 마지막 ratingAfter = 현재 클럽 레이팅, 길이 = 경기 수 → 헤더 뱃지 파생.
function deriveHeaderRating(history: RatingHistoryPoint[]): { clubRating?: number; provisional: boolean } {
    if (history.length === 0) return { clubRating: undefined, provisional: false }
    return { clubRating: history[history.length - 1].ratingAfter, provisional: isProvisional(history.length) }
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

        // 클럽 scope일 때만 레이팅 추세/헤더 뱃지 표시
        const ratingHistory = scope.kind === 'club'
            ? await fetchClubRatingHistory(scope.clubId, userId)
            : []
        const { clubRating, provisional } = deriveHeaderRating(ratingHistory)

        // 탭 렌더용 간략 클럽 목록
        const clubsForTab = myClubs.map((c) => ({ id: c.id, name: c.name }))

        return (
            <PageContainer>
                <div className="space-y-4">
                    <MemberProfileHeader
                        user={target}
                        clubName={scope.kind === 'club' ? scope.clubName : club?.name}
                        clubRating={clubRating}
                        provisional={provisional}
                    />
                    <Suspense>
                        <AnalyticsModeTabs
                            scope={scope}
                            clubs={clubsForTab}
                            basePath={`/profile/${userId}`}
                        />
                    </Suspense>
                </div>
                <SelfAnalyticsSection bundle={bundle} me={target} scope={scope} ratingHistory={ratingHistory} />
            </PageContainer>
        )
    }

    // 타인 프로필: 공개 요약 통계
    const privacy = target.statsHidden ? 'locked' : 'public'
    const [bundle, ratingHistory] = await Promise.all([
        fetchPlayerStatsBundle(userId, clubId),
        clubId ? fetchClubRatingHistory(clubId, userId) : Promise.resolve([] as RatingHistoryPoint[]),
    ])
    // 통계 비공개(statsHidden) 프로필에서는 클럽 레이팅을 노출하지 않는다(헤더·추세 모두).
    const { clubRating, provisional } = target.statsHidden
        ? { clubRating: undefined, provisional: false }
        : deriveHeaderRating(ratingHistory)

    return (
        <PageContainer>
            <MemberProfileHeader
                user={target}
                clubName={club?.name}
                clubRating={clubRating}
                provisional={provisional}
            />
            <PlayerStatsSection
                bundle={bundle}
                gender={target.gender}
                userId={target.id}
                privacy={privacy}
                editable={false}
                statsHidden={target.statsHidden}
                ratingHistory={ratingHistory}
                clubName={club?.name}
            />
        </PageContainer>
    )
}

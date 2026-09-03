import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchUserById } from '@/lib/queries/users'
import { fetchClubById, fetchMyClubs } from '@/lib/queries/clubs'
import type { AnalyticsScope } from '@/lib/queries/analytics'
import { fetchPlayerStatsBundle } from '@/lib/queries/player-profile'
import {
    type ClubRatingRankingEntry,
    type RatingHistoryPoint,
} from '@/lib/queries/ratings'
// TODO(redesign): DB 재설계(club_player_ratings/club_rating_history) 후 실제 쿼리로 교체.
import { dummyClubRatingHistory, dummyClubRatingRanking, dummyUserClubRatings } from '@/lib/redesign-fixtures/ratings'
// TODO(redesign): 실 Supabase 연동 복원 시 fetchAnalyticsBundle(userId, { scope })로 되돌리고 fixture 파라미터 제거.
import { getDummyAnalyticsBundle } from '@/lib/redesign-fixtures/personal-analytics'
import { parseFixtureScenario } from '@/lib/redesign-fixtures/_scenario'
import { ProfileScopeTabs } from '@/components/profile/profile-scope-tabs'
import { personalNavHref } from '@/lib/nav-items'
import type { RatingSummary } from '@/components/profile/rating-summary-row'
import { isProvisional } from '@/lib/rating/display'
import { replayPersonalRatings } from '@/lib/rating/personal-rating'
import { aggregateRecentForm, type RecentFormResult } from '@/lib/analytics/form'
import { combinePlayerStats, type PlayerStats } from '@/lib/stats'
import type { ProfileSummary } from '@/components/profile/profile-summary-row'
import type { MatchType } from '@/types'
import { MemberProfileHeader } from '@/components/profile/member-profile-header'
import { PlayerStatsSection } from '@/components/profile/player-stats-section'
import { SelfAnalyticsSection } from '@/components/profile/self-analytics-section'
import { PageContainer } from '@/components/common/page-container'
import { OnboardingChecklist } from '@/components/onboarding/onboarding-checklist'
import { buildOnboardingSteps, isOnboardingComplete } from '@/lib/onboarding'

type Props = {
    params: Promise<{ userId: string }>
    // fixture: 재설계 임시 — 'empty'면 데이터 없음 시나리오 (기본 데이터 있음)
    searchParams: Promise<{ clubId?: string; scope?: string; fixture?: string }>
}

// 추세 이력 마지막 ratingAfter = 현재 클럽 레이팅, 길이 = 경기 수 → 헤더 뱃지 파생.
function deriveHeaderRating(history: RatingHistoryPoint[]): { clubRating?: number; provisional: boolean } {
    if (history.length === 0) return { clubRating: undefined, provisional: false }
    return { clubRating: history[history.length - 1].ratingAfter, provisional: isProvisional(history.length) }
}

// 레이팅 랭킹에서 본인 순위(1-based). 행 없으면 undefined.
function rankOf(ranking: ClubRatingRankingEntry[], userId: string): number | undefined {
    const i = ranking.findIndex((r) => r.userId === userId)
    return i >= 0 ? i + 1 : undefined
}

type QuarterStats = { singles: PlayerStats; menDoubles: PlayerStats; womenDoubles: PlayerStats; mixedDoubles: PlayerStats }

// 헤더 3대 스탯: 경기 수·승률(무승부 제외)·현재 연승(연승 중 아니면 0).
function deriveHeaderStats(stats: QuarterStats, form: RecentFormResult): { games: number; winRate: number; winStreak: number } {
    const overall = combinePlayerStats(stats.singles, stats.menDoubles, stats.womenDoubles, stats.mixedDoubles)
    const winStreak = form.currentStreak?.type === 'W' ? form.currentStreak.length : 0
    return { games: overall.totalMatches, winRate: overall.winRate, winStreak }
}

// 비클럽 scope(본인) 헤더 요약: 승률 링 + 보조 행. 주력 종목 = 경기 수 최다 종류.
function deriveSummary(stats: QuarterStats): ProfileSummary {
    const overall = combinePlayerStats(stats.singles, stats.menDoubles, stats.womenDoubles, stats.mixedDoubles)
    const counts: Array<[MatchType, number]> = [
        ['singles', stats.singles.totalMatches],
        ['men_doubles', stats.menDoubles.totalMatches],
        ['women_doubles', stats.womenDoubles.totalMatches],
        ['mixed_doubles', stats.mixedDoubles.totalMatches],
    ]
    const top = counts.reduce((a, b) => (b[1] > a[1] ? b : a))
    return {
        winRate: overall.winRate,
        wins: overall.wins,
        losses: overall.losses,
        draws: overall.draws,
        topMatchType: top[1] > 0 ? top[0] : undefined,
    }
}

export default async function MemberProfilePage({ params, searchParams }: Props) {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) redirect('/login')

    const { userId } = await params
    const { clubId, scope: scopeParam, fixture } = await searchParams

    const [target, club] = await Promise.all([
        fetchUserById(userId),
        clubId ? fetchClubById(clubId) : Promise.resolve(null),
    ])
    if (!target) notFound()

    const isSelf = authUser.id === userId

    if (isSelf) {
        // 가입 클럽 목록 로드 (scope 탭 + 클럽 ID 검증에 사용)
        const myClubs = await fetchMyClubs(userId)

        // scope 결정: total(명시) | <clubId>(가입 클럽 중 일치) | personal(기본 — '개인' 메뉴·로그인 진입점과 동일)
        const matchedClub = myClubs.find((c) => c.id === scopeParam)
        const scope: AnalyticsScope = scopeParam === 'total'
            ? { kind: 'total' }
            : matchedClub
            ? { kind: 'club', clubId: matchedClub.id, clubName: matchedClub.name }
            : { kind: 'personal' }

        const scenario = parseFixtureScenario(fixture)
        const bundle = getDummyAnalyticsBundle({ userId, gender: target.gender, scope, scenario })
        // '개인' 탭 링크 — 빈 상태 검수용 fixture 파라미터를 유지한다
        const personalHref = scenario === 'empty' ? `${personalNavHref(userId)}&fixture=empty` : personalNavHref(userId)

        // 클럽 scope일 때만 레이팅 추세/순위/헤더 뱃지 표시
        const [ratingHistory, ranking] = await Promise.all([
            scope.kind === 'club' ? Promise.resolve(dummyClubRatingHistory()) : Promise.resolve([] as RatingHistoryPoint[]),
            scope.kind === 'club' ? Promise.resolve(dummyClubRatingRanking()) : Promise.resolve([] as ClubRatingRankingEntry[]),
        ])
        const { clubRating, provisional } = deriveHeaderRating(ratingHistory)
        const clubRank = scope.kind === 'club' ? rankOf(ranking, userId) : undefined
        // 최근 폼은 통계 분해본(personalGames)으로 — 원본(personalMatches)을 넘기면 미확정(세트 없음) 레코드가 승패 없이 섞인다
        const form = aggregateRecentForm(
            { matches: bundle.matches, gameMetaById: bundle.gameMetaById, personalMatches: bundle.personalGames },
            userId,
        )
        const headerStats = deriveHeaderStats(bundle.stats, form)
        // 클럽 scope는 티어 헤더, 그 외는 승률 링 요약 헤더
        const summary = scope.kind !== 'club' ? deriveSummary(bundle.stats) : undefined
        // 개인 경기 레이팅(온더플라이). 개인 탭은 티어 방패로, 통합 탭은 요약 칩으로 쓴다. 클럽 scope는 불필요.
        const personalRatingSnapshot = scope.kind !== 'club'
            ? replayPersonalRatings(bundle.personalGames, target.ntrp ?? null, (id) => bundle.userMap.get(id)?.ntrp)
            : null
        const personalRating = personalRatingSnapshot && personalRatingSnapshot.matchesPlayed > 0
            ? {
                  rating: personalRatingSnapshot.rating,
                  provisional: personalRatingSnapshot.provisional,
                  matchesPlayed: personalRatingSnapshot.matchesPlayed,
              }
            : undefined

        // 통합 탭: 자가선언·개인·가입 클럽별 레이팅을 헤더에 요약(클럽별 본인 레이팅 일괄 조회).
        let ratingSummary: RatingSummary | undefined
        if (scope.kind === 'total') {
            const clubRatingMap = dummyUserClubRatings(myClubs.map((c) => c.id))
            const clubs = myClubs
                .map((c) => {
                    const r = clubRatingMap[c.id]
                    return r
                        ? {
                              clubName: c.name,
                              rating: r.rating,
                              provisional: isProvisional(r.matchesPlayed),
                              matchesPlayed: r.matchesPlayed,
                          }
                        : null
                })
                .filter(
                    (c): c is { clubName: string; rating: number; provisional: boolean; matchesPlayed: number } =>
                        c !== null,
                )
            ratingSummary = { selfNtrp: target.ntrp, personal: personalRating, clubs }
        }

        // 온보딩 체크리스트 — 기본 탭(개인)에서만, 미완료 단계가 남았을 때 노출.
        // 완료 판정은 이미 로드한 데이터(개인 경기 수·프로필 이미지·가입 클럽)만 사용.
        const onboardingSteps = buildOnboardingSteps({
            userId,
            hasPersonalMatch: bundle.personalMatches.length > 0,
            hasProfileImage: Boolean(target.profileImage),
            hasClub: myClubs.length > 0,
        })
        const showOnboarding = scope.kind === 'personal' && !isOnboardingComplete(onboardingSteps)

        return (
            <PageContainer>
                <MemberProfileHeader
                    user={target}
                    clubName={scope.kind === 'club' ? scope.clubName : club?.name}
                    clubRating={clubRating}
                    provisional={provisional}
                    clubRank={clubRank}
                    stats={headerStats}
                    summary={summary}
                    recentForm={form}
                    personalRating={scope.kind === 'personal' ? personalRating : undefined}
                    ratingSummary={ratingSummary}
                />
                {/* 통계 범위 탭 스캐폴드 — 개인만 동작, 클럽/통합은 준비 중 */}
                <ProfileScopeTabs scope={scope} personalHref={personalHref} />
                {/* 0경기(비클럽 scope)는 헤더 카드가 빈 상태 안내를 담당 → 체크리스트 숨김(중복 방지) */}
                {!(headerStats.games === 0 && scope.kind !== 'club') && showOnboarding && (
                    <OnboardingChecklist steps={onboardingSteps} />
                )}
                <SelfAnalyticsSection bundle={bundle} me={target} scope={scope} ratingHistory={ratingHistory} />
            </PageContainer>
        )
    }

    // 타인 프로필: 공개 요약 통계
    const privacy = target.statsHidden ? 'locked' : 'public'
    const showStats = !target.statsHidden
    const [bundle, ratingHistory, ranking] = await Promise.all([
        fetchPlayerStatsBundle(userId, clubId),
        clubId ? Promise.resolve(dummyClubRatingHistory()) : Promise.resolve([] as RatingHistoryPoint[]),
        clubId && showStats ? Promise.resolve(dummyClubRatingRanking()) : Promise.resolve([] as ClubRatingRankingEntry[]),
    ])
    // 통계 비공개(statsHidden) 프로필에서는 클럽 레이팅·스탯·순위를 노출하지 않는다(헤더·추세 모두).
    const { clubRating, provisional } = showStats
        ? deriveHeaderRating(ratingHistory)
        : { clubRating: undefined, provisional: false }
    const clubRank = clubId && showStats ? rankOf(ranking, userId) : undefined
    // 타인 번들에는 personalMatches가 없으므로 [] 보강(클럽 scope라 개인 경기 무관).
    const headerStats = showStats
        ? deriveHeaderStats(
              bundle.stats,
              aggregateRecentForm({ matches: bundle.matches, gameMetaById: bundle.gameMetaById, personalMatches: [] }, userId),
          )
        : undefined

    return (
        <PageContainer>
            <MemberProfileHeader
                user={target}
                clubName={club?.name}
                clubRating={clubRating}
                provisional={provisional}
                clubRank={clubRank}
                stats={headerStats}
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

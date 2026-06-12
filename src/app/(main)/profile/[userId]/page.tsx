import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchUserById } from '@/lib/queries/users'
import { fetchClubById, fetchMyClubs } from '@/lib/queries/clubs'
import { fetchAnalyticsBundle, type AnalyticsScope } from '@/lib/queries/analytics'
import { fetchPlayerStatsBundle } from '@/lib/queries/player-profile'
import {
    fetchClubRatingHistory,
    fetchClubRatingRanking,
    type ClubRatingRankingEntry,
    type RatingHistoryPoint,
} from '@/lib/queries/ratings'
import { isProvisional } from '@/lib/rating/display'
import { aggregateRecentForm, type RecentFormResult } from '@/lib/analytics/form'
import { combinePlayerStats, type PlayerStats } from '@/lib/stats'
import type { ProfileSummary } from '@/components/profile/profile-summary-row'
import type { MatchType } from '@/types'
import { MemberProfileHeader } from '@/components/profile/member-profile-header'
import { PlayerStatsSection } from '@/components/profile/player-stats-section'
import { SelfAnalyticsSection } from '@/components/profile/self-analytics-section'
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
function deriveSummary(stats: QuarterStats, form: RecentFormResult): ProfileSummary {
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
        streak: form.currentStreak,
        topMatchType: top[1] > 0 ? top[0] : undefined,
    }
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

        // 클럽 scope일 때만 레이팅 추세/순위/헤더 뱃지 표시
        const [ratingHistory, ranking] = await Promise.all([
            scope.kind === 'club' ? fetchClubRatingHistory(scope.clubId, userId) : Promise.resolve([] as RatingHistoryPoint[]),
            scope.kind === 'club' ? fetchClubRatingRanking(scope.clubId) : Promise.resolve([] as ClubRatingRankingEntry[]),
        ])
        const { clubRating, provisional } = deriveHeaderRating(ratingHistory)
        const clubRank = scope.kind === 'club' ? rankOf(ranking, userId) : undefined
        const form = aggregateRecentForm(bundle, userId)
        const headerStats = deriveHeaderStats(bundle.stats, form)
        // 클럽 scope는 티어 헤더, 그 외는 승률 링 요약 헤더
        const summary = scope.kind !== 'club' ? deriveSummary(bundle.stats, form) : undefined

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
                />
                <SelfAnalyticsSection bundle={bundle} me={target} scope={scope} ratingHistory={ratingHistory} />
            </PageContainer>
        )
    }

    // 타인 프로필: 공개 요약 통계
    const privacy = target.statsHidden ? 'locked' : 'public'
    const showStats = !target.statsHidden
    const [bundle, ratingHistory, ranking] = await Promise.all([
        fetchPlayerStatsBundle(userId, clubId),
        clubId ? fetchClubRatingHistory(clubId, userId) : Promise.resolve([] as RatingHistoryPoint[]),
        clubId && showStats ? fetchClubRatingRanking(clubId) : Promise.resolve([] as ClubRatingRankingEntry[]),
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

import { notFound, redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProfileHeader } from '@/components/profile/profile-header'
import { StatsCards } from '@/components/profile/stats-cards'
import { HeadToHeadTable } from '@/components/profile/head-to-head-table'
import { RecentMatches } from '@/components/profile/recent-matches'
import { StatsScopeNotice } from '@/components/profile/stats-scope-notice'
import { createClient } from '@/lib/supabase/server'
import { fetchUserById, fetchUsersByIds } from '@/lib/queries/users'
import { fetchMatchesByUser } from '@/lib/queries/match-games'
import { fetchUserMatchStats, fetchUserHeadToHead } from '@/lib/queries/stats'
import { getMatchesByUser } from '@/lib/stats'
import { Users } from 'lucide-react'

type ProfilePageProps = {
    params: Promise<{ userId: string }>
}

export default async function ProfilePage({ params }: ProfilePageProps) {
    const { userId } = await params

    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) redirect('/login')

    const [profile, allMatches, { singles: singlesStats, doubles: doublesStats }, h2h] = await Promise.all([
        fetchUserById(userId),
        fetchMatchesByUser(userId),
        fetchUserMatchStats(userId),
        fetchUserHeadToHead(userId),
    ])

    if (!profile) notFound()

    const myMatches = getMatchesByUser(allMatches, userId)

    const opponentIds = [...new Set(
        allMatches.flatMap((m) => [
            m.player1Id, m.player2Id,
            ...(m.team1 ?? []), ...(m.team2 ?? []),
        ]).filter((id): id is string => !!id && id !== userId)
    )]
    const opponentUsers = await fetchUsersByIds(opponentIds)
    const userMap = new Map(opponentUsers.map((u) => [u.id, u]))

    const isMine = authUser.id === userId
    const totalWins = singlesStats.wins + doublesStats.wins
    const totalLosses = singlesStats.losses + doublesStats.losses
    const totalDraws = singlesStats.draws + doublesStats.draws
    const totalMatches = totalWins + totalLosses + totalDraws
    const totalDecisive = totalWins + totalLosses
    const totalWinRate = totalDecisive === 0 ? 0 : Math.round((totalWins / totalDecisive) * 100)

    return (
        <div className="space-y-6">
            {/* 프로필 헤더 */}
            <Card className="bg-card border-white/5">
                <CardContent className="pt-6 pb-6">
                    <div className="space-y-4">
                        <ProfileHeader profile={profile} isMine={isMine} />

                        {/* 요약 통계 */}
                        <div className="flex items-center gap-6 pt-2 border-t border-white/5">
                            <div className="text-center">
                                <p className="text-2xl font-bold">{totalMatches}</p>
                                <p className="text-xs text-muted-foreground">총 경기</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-emerald-400">{totalWins}</p>
                                <p className="text-xs text-muted-foreground">승</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-muted-foreground">{totalLosses}</p>
                                <p className="text-xs text-muted-foreground">패</p>
                            </div>
                            {totalDraws > 0 && (
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-amber-400">{totalDraws}</p>
                                    <p className="text-xs text-muted-foreground">무</p>
                                </div>
                            )}
                            <div className="text-center">
                                <p className="text-2xl font-bold text-blue-400">{totalWinRate}%</p>
                                <p className="text-xs text-muted-foreground">승률</p>
                            </div>
                        </div>

                        <StatsScopeNotice />
                    </div>
                </CardContent>
            </Card>

            {/* 메인 그리드 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* 좌측 컬럼 (2/3) */}
                <div className="lg:col-span-2 space-y-4">

                    <Card className="bg-card border-white/5">
                        <CardHeader className="pb-2 pt-4 px-4">
                            <CardTitle className="text-sm font-medium">단식 통계</CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <StatsCards stats={singlesStats} />
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-white/5">
                        <CardHeader className="pb-2 pt-4 px-4">
                            <CardTitle className="text-sm font-medium">복식 통계</CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <StatsCards stats={doublesStats} />
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-white/5">
                        <CardHeader className="pb-2 pt-4 px-4">
                            <CardTitle className="text-sm font-medium">최근 경기</CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <RecentMatches matches={myMatches} userId={userId} userMap={userMap} />
                        </CardContent>
                    </Card>
                </div>

                {/* 우측 컬럼 (1/3) */}
                <div className="space-y-4">
                    <Card className="bg-card border-white/5">
                        <CardHeader className="pb-2 pt-4 px-4">
                            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                                <Users className="w-4 h-4 text-violet-400" />
                                상대별 전적
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <HeadToHeadTable records={h2h} userMap={userMap} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { StatsCards } from '@/components/profile/stats-cards'
import { HeadToHeadTable } from '@/components/profile/head-to-head-table'
import { RecentMatches } from '@/components/profile/recent-matches'
import { PendingMembersCard } from '@/components/clubs/pending-members-card'
import { getUserById } from '@/lib/dummy/users'
import { dummyClubs } from '@/lib/dummy/clubs'
import { dummyTournaments } from '@/lib/dummy/tournaments'
import { getStoredClubs } from '@/lib/store/club-store'
import { getJoinedClubIds } from '@/lib/store/club-member-store'
import { calcPlayerStats, calcHeadToHead, getMatchesByUser } from '@/lib/stats'
import { createClient } from '@/lib/supabase/client'
import { Users, Trophy, ChevronRight, Award, Calendar, Shield } from 'lucide-react'
import type { User } from '@/types'

export default function DashboardPage() {
    const [me, setMe] = useState<User | null>(null)
    const [myClubs, setMyClubs] = useState<ReturnType<typeof dummyClubs.filter>>([])

    useEffect(() => {
        let isMounted = true
        const supabase = createClient()

        supabase.auth.getUser().then(({ data: { user: authUser } }) => {
            if (!isMounted || !authUser) return
            const user = getUserById(authUser.id)
            if (!user) return
            setMe(user)

            const allClubs = [...dummyClubs, ...getStoredClubs()]
            const joinedIds = getJoinedClubIds(authUser.id)
            setMyClubs(allClubs.filter((c) => joinedIds.includes(c.id)))
        })

        return () => {
            isMounted = false
        }
    }, [])

    if (!me) {
        return (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                불러오는 중...
            </div>
        )
    }

    const myClubIds = myClubs.map((c) => c.id)
    const ongoingTournaments = dummyTournaments.filter(
        (t) => myClubIds.includes(t.clubId) && !t.isFixed
    )

    const myMatches = getMatchesByUser([], me.id)
    const stats = calcPlayerStats([], me.id)
    const h2h = calcHeadToHead([], me.id)

    return (
        <div className="space-y-6">
            {/* 프로필 헤더 */}
            <Card className="bg-card border-white/5">
                <CardContent className="pt-6 pb-6">
                    <div className="flex items-center gap-4">
                        <Avatar className="w-16 h-16">
                            <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
                                {me.nickname[0]}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-2xl font-bold">{me.name}</h1>
                                {me.role === 'admin' && (
                                    <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-400 gap-1">
                                        <Shield className="w-3 h-3" />
                                        관리자
                                    </Badge>
                                )}
                                <Badge variant="outline" className="text-xs font-mono">
                                    <Award className="w-3 h-3 mr-1" />
                                    NTRP {me.ntrp.toFixed(1)}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
                                <span>{me.gender === 'male' ? '남성' : '여성'} · {me.dominantHand === 'right' ? '오른손잡이' : '왼손잡이'}</span>
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    테니스 시작: {me.tennisStartDate}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{me.email} · {me.createdAt} 가입</p>
                        </div>
                        <div className="hidden sm:flex items-center gap-6 pr-2">
                            <div className="text-center">
                                <p className="text-2xl font-bold">{stats.totalMatches}</p>
                                <p className="text-xs text-muted-foreground">총 경기</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-emerald-400">{stats.wins}</p>
                                <p className="text-xs text-muted-foreground">승</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-blue-400">{stats.winRate}%</p>
                                <p className="text-xs text-muted-foreground">승률</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 메인 그리드 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* 좌측 컬럼 (2/3) */}
                <div className="lg:col-span-2 space-y-4">

                    {/* 전체 통계 */}
                    <Card className="bg-card border-white/5">
                        <CardHeader className="pb-2 pt-4 px-4">
                            <CardTitle className="text-sm font-medium">전체 통계</CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <StatsCards stats={stats} />
                        </CardContent>
                    </Card>

                    {/* 최근 경기 */}
                    <Card className="bg-card border-white/5">
                        <CardHeader className="pb-2 pt-4 px-4">
                            <CardTitle className="text-sm font-medium">최근 경기</CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <RecentMatches matches={myMatches} userId={me.id} />
                        </CardContent>
                    </Card>
                </div>

                {/* 우측 컬럼 (1/3) */}
                <div className="space-y-4">

                    {/* 가입 승인 대기 (클럽 오너인 경우에만 표시) */}
                    <PendingMembersCard currentUserId={me.id} />

                    {/* 내 클럽 */}
                    <Card className="bg-card border-white/5">
                        <CardHeader className="pb-2 pt-4 px-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                                    <Users className="w-4 h-4 text-violet-400" />
                                    내 클럽
                                </CardTitle>
                                <Link href="/clubs" className="text-xs text-muted-foreground hover:text-foreground">
                                    전체보기 →
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="px-4 pb-4 space-y-2">
                            {myClubs.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-4">가입한 클럽 없음</p>
                            ) : (
                                myClubs.map((club) => (
                                    <Link key={club.id} href={`/clubs/${club.id}`}>
                                        <div className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                                            <div className="w-7 h-7 rounded-md bg-violet-500/20 flex items-center justify-center shrink-0">
                                                <Users className="w-3.5 h-3.5 text-violet-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium truncate">{club.name}</p>
                                                <p className="text-xs text-muted-foreground">{club.memberCount}명</p>
                                            </div>
                                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                        </div>
                                    </Link>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* 진행 중인 대진표 */}
                    <Card className="bg-card border-white/5">
                        <CardHeader className="pb-2 pt-4 px-4">
                            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                                <Trophy className="w-4 h-4 text-amber-400" />
                                진행 중인 대진표
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4 space-y-2">
                            {ongoingTournaments.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-4">진행 중인 대진표 없음</p>
                            ) : (
                                ongoingTournaments.map((t) => (
                                    <Link key={t.id} href={`/clubs/${t.clubId}/tournaments/${t.id}`}>
                                        <div className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                                            <div className="w-7 h-7 rounded-md bg-amber-500/20 flex items-center justify-center shrink-0">
                                                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium truncate">{t.name}</p>
                                                <p className="text-xs text-muted-foreground">{t.date}</p>
                                            </div>
                                            <Badge variant="default" className="text-xs shrink-0 bg-amber-500/20 text-amber-400 border-0">
                                                진행중
                                            </Badge>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* 상대별 전적 */}
                    <Card className="bg-card border-white/5">
                        <CardHeader className="pb-2 pt-4 px-4">
                            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                                <Users className="w-4 h-4 text-violet-400" />
                                상대별 전적
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <HeadToHeadTable records={h2h} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

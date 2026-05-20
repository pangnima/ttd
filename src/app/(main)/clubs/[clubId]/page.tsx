import { notFound } from 'next/navigation'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/server'
import { fetchClubById, fetchClubMembers, fetchMyMembership } from '@/lib/queries/clubs'
import { ClubDetailActions } from '@/components/clubs/club-detail-actions'
import { ClubMembersPreview } from '@/components/clubs/club-members-preview'
import { ClubAvatar } from '@/components/clubs/club-avatar'
import { MapPin, Users, Trophy, Settings, ChevronRight } from 'lucide-react'

type ClubPageProps = {
    params: Promise<{ clubId: string }>
}

export default async function ClubPage({ params }: ClubPageProps) {
    const { clubId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const [club, approvedMembers, myMembership] = await Promise.all([
        fetchClubById(clubId),
        fetchClubMembers(clubId, 'approved'),
        fetchMyMembership(user.id, clubId),
    ])

    if (!club) notFound()

    const isOwner = myMembership?.role === 'owner'

    // Week 8에서 match_game_matches Supabase 연결 예정
    const ongoingMatchGames: { id: string; name: string; date: string }[] = []

    return (
        <div className="w-full max-w-4xl space-y-6">
            {/* 클럽 헤더 */}
            <div className="space-y-2">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <ClubAvatar name={club.name} logoUrl={club.logoUrl} size="lg" />
                        <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold">{club.name}</h1>
                            <Badge variant={club.isPublic ? 'default' : 'secondary'}>
                                {club.isPublic ? '공개' : '비공개'}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm">{club.description}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {!isOwner && (
                            <ClubDetailActions
                                clubId={clubId}
                                membershipStatus={myMembership?.status ?? null}
                            />
                        )}
                        {isOwner && (
                            <Link
                                href={`/clubs/${clubId}/settings`}
                                className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'shrink-0')}
                            >
                                <Settings className="w-4 h-4" />
                            </Link>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {club.region}
                    </span>
                    <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {approvedMembers.length}명
                    </span>
                    <span className="flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5" />
                        {ongoingMatchGames.length}개 대진표
                    </span>
                </div>
            </div>

            <Separator />

            {/* 진행 중인 대진표 */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold">진행 중인 대진표</h2>
                    <Link
                        href={`/clubs/${clubId}/match-games`}
                        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                    >
                        전체보기 <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
                {ongoingMatchGames.length > 0 ? (
                    <ul className="space-y-2">
                        {ongoingMatchGames.map((mg) => (
                            <li key={mg.id}>
                                <Link
                                    href={`/clubs/${clubId}/match-games/${mg.id}`}
                                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                                >
                                    <div>
                                        <p className="text-sm font-medium">{mg.name}</p>
                                        <p className="text-xs text-muted-foreground">{mg.date}</p>
                                    </div>
                                    <Badge variant="secondary" className="text-xs">진행중</Badge>
                                </Link>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
                        진행 중인 대진표가 없습니다.
                    </p>
                )}
            </section>

            <Separator />

            {/* 회원 미리보기 */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold">회원 ({approvedMembers.length}명)</h2>
                    <Link
                        href={`/clubs/${clubId}/members`}
                        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                    >
                        전체보기 <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
                <ClubMembersPreview members={approvedMembers} maxDisplay={8} />
            </section>
        </div>
    )
}

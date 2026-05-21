import { notFound } from 'next/navigation'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/server'
import { fetchClubById, fetchClubMembers, fetchMyMembership } from '@/lib/queries/clubs'
import { fetchMatchGameCountByClubId } from '@/lib/queries/match-games'
import { ClubDetailActions } from '@/components/clubs/club-detail-actions'
import { ClubMembersPreview } from '@/components/clubs/club-members-preview'
import { ClubAvatar } from '@/components/clubs/club-avatar'
import {
    CARD_BASE,
    SECTION_LABEL,
    PILL_BASE,
    TEXT_META,
    TEXT_MUTED,
} from '@/lib/dashboard/tokens'
import { MapPin, Users, Trophy, Settings, ChevronRight, Calendar, Crown } from 'lucide-react'

type ClubPageProps = {
    params: Promise<{ clubId: string }>
}

function formatFoundedDate(createdAt: string): string {
    return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long' }).format(
        new Date(createdAt)
    )
}

export default async function ClubPage({ params }: ClubPageProps) {
    const { clubId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const [club, approvedMembers, myMembership, matchGameCount] = await Promise.all([
        fetchClubById(clubId),
        fetchClubMembers(clubId, 'approved'),
        fetchMyMembership(user.id, clubId),
        fetchMatchGameCountByClubId(clubId),
    ])

    if (!club) notFound()

    const isOwner = myMembership?.role === 'owner'
    const ownerMember = approvedMembers.find((m) => m.role === 'owner')

    return (
        <div className="w-full max-w-4xl space-y-6">
            {/* 헤더 */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <ClubAvatar name={club.name} logoUrl={club.logoUrl} size="lg" />
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-foreground">{club.name}</h1>
                            <span
                                className={`${PILL_BASE} ${
                                    club.isPublic
                                        ? 'border-emerald-400/40 text-emerald-400/85 bg-emerald-400/8'
                                        : 'border-foreground/20 text-foreground/60'
                                }`}
                            >
                                {club.isPublic ? '공개' : '비공개'}
                            </span>
                        </div>
                        {club.description && (
                            <p className={`text-sm ${TEXT_META}`}>{club.description}</p>
                        )}
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

            {/* 통계 카드 3분할 */}
            <div className="grid grid-cols-3 gap-3">
                <div className={`${CARD_BASE} flex flex-col gap-1.5 p-4`}>
                    <div className="flex items-center gap-1.5">
                        <Users className={`w-3.5 h-3.5 ${TEXT_MUTED}`} />
                        <span className={`text-[11px] ${TEXT_MUTED}`}>회원 수</span>
                    </div>
                    <p className="text-xl font-semibold text-foreground">{approvedMembers.length}<span className={`text-sm font-normal ml-0.5 ${TEXT_META}`}>명</span></p>
                </div>
                <div className={`${CARD_BASE} flex flex-col gap-1.5 p-4`}>
                    <div className="flex items-center gap-1.5">
                        <Trophy className={`w-3.5 h-3.5 ${TEXT_MUTED}`} />
                        <span className={`text-[11px] ${TEXT_MUTED}`}>대진표</span>
                    </div>
                    <p className="text-xl font-semibold text-foreground">{matchGameCount}<span className={`text-sm font-normal ml-0.5 ${TEXT_META}`}>개</span></p>
                </div>
                <div className={`${CARD_BASE} flex flex-col gap-1.5 p-4`}>
                    <div className="flex items-center gap-1.5">
                        <Calendar className={`w-3.5 h-3.5 ${TEXT_MUTED}`} />
                        <span className={`text-[11px] ${TEXT_MUTED}`}>설립</span>
                    </div>
                    <p className="text-sm font-medium text-foreground/90 mt-0.5">{formatFoundedDate(club.createdAt)}</p>
                </div>
            </div>

            {/* 클럽 정보 카드 */}
            <div className={`${CARD_BASE} divide-y divide-foreground/8`}>
                {ownerMember && (
                    <div className="flex items-center gap-3 px-4 py-3">
                        <Crown className={`w-4 h-4 shrink-0 ${TEXT_MUTED}`} />
                        <span className={`text-xs ${TEXT_MUTED} w-16 shrink-0`}>운영자</span>
                        <span className="text-sm text-foreground/85">{ownerMember.user.name}</span>
                    </div>
                )}
                {club.region && (
                    <div className="flex items-center gap-3 px-4 py-3">
                        <MapPin className={`w-4 h-4 shrink-0 ${TEXT_MUTED}`} />
                        <span className={`text-xs ${TEXT_MUTED} w-16 shrink-0`}>지역</span>
                        <span className="text-sm text-foreground/85">{club.region}</span>
                    </div>
                )}
            </div>

            {/* 회원 미리보기 */}
            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <p className={SECTION_LABEL}>회원 ({approvedMembers.length}명)</p>
                    <Link
                        href={`/clubs/${clubId}/members`}
                        className={`text-xs ${TEXT_MUTED} hover:text-foreground flex items-center gap-0.5 transition-colors`}
                    >
                        전체보기 <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
                <ClubMembersPreview members={approvedMembers} maxDisplay={8} />
            </section>
        </div>
    )
}

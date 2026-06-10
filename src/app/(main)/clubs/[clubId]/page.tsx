import { notFound } from 'next/navigation'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/server'
import { fetchClubById, fetchClubMembers, fetchMyMembership } from '@/lib/queries/clubs'
import { fetchMatchGameCountByClubId } from '@/lib/queries/match-games'
import { fetchClubRatingRanking } from '@/lib/queries/ratings'
import {
    fetchPendingMembersByClubId,
    fetchClubMatchGameActivity,
    fetchClubActivityRanking,
    fetchClubWinRateRanking,
} from '@/lib/queries/club-dashboard'
import { ClubDetailActions } from '@/components/clubs/club-detail-actions'
import { ClubMembersPreview } from '@/components/clubs/club-members-preview'
import { ClubAvatar } from '@/components/clubs/club-avatar'
import { PendingMembersPanel } from '@/components/club-dashboard/pending-members-panel'
import { MatchGameActivityCard } from '@/components/club-dashboard/match-game-activity-card'
import { WinRateRankingCard } from '@/components/club-dashboard/win-rate-ranking-card'
import { ActivityRankingCard } from '@/components/club-dashboard/activity-ranking-card'
import { RatingRankingCard } from '@/components/club-dashboard/rating-ranking-card'
import {
    CARD_BASE,
    SECTION_LABEL,
    PILL_BASE,
    TEXT_META,
    TEXT_MUTED,
} from '@/lib/dashboard/tokens'
import { PageContainer } from '@/components/common/page-container'
import { formatYearMonth } from '@/lib/format'
import { MapPin, Users, Trophy, Settings, ChevronRight, Calendar, Crown } from 'lucide-react'

type ClubPageProps = {
    params: Promise<{ clubId: string }>
}

export default async function ClubPage({ params }: ClubPageProps) {
    const { clubId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const [club, approvedMembers, myMembership, matchGameCount, ratingRanking] = await Promise.all([
        fetchClubById(clubId),
        fetchClubMembers(clubId, 'approved'),
        fetchMyMembership(user.id, clubId),
        fetchMatchGameCountByClubId(clubId),
        fetchClubRatingRanking(clubId),
    ])

    if (!club) notFound()

    const regularMembers = approvedMembers.filter((m) => !m.user.isGuest)
    const guestMembers = approvedMembers.filter((m) => m.user.isGuest)

    const isOwner = myMembership?.role === 'owner'
    const isOfficerOrOwner = myMembership?.role === 'owner' || myMembership?.role === 'officer'
    const ownerMember = approvedMembers.find((m) => m.role === 'owner')

    // 운영자/임원인 경우에만 추가 데이터 페치
    const [pendingMembers, matchGameActivity, activityRanking, winRateRanking] = isOfficerOrOwner
        ? await Promise.all([
            fetchPendingMembersByClubId(clubId),
            fetchClubMatchGameActivity(clubId),
            fetchClubActivityRanking(clubId),
            fetchClubWinRateRanking(clubId),
        ])
        : [null, null, null, null]

    return (
        <PageContainer>
            {/* 헤더 */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <ClubAvatar name={club.name} logoUrl={club.logoUrl} size="lg" />
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h1 className={`${SECTION_LABEL} text-2xl`}>{club.name}</h1>
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
                            <p className="text-sm text-foreground/60 mt-1">{club.description}</p>
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className={`${CARD_BASE} flex flex-col gap-1.5 p-4`}>
                    <div className="flex items-center gap-1.5">
                        <Users className={`w-3.5 h-3.5 ${TEXT_MUTED}`} />
                        <span className={`text-[11px] ${TEXT_MUTED}`}>회원 수</span>
                    </div>
                    <div className="flex items-end gap-4">
                        <div className="flex flex-col">
                            <span className={`text-[11px] ${TEXT_META}`}>정회원</span>
                            <p className="text-xl font-semibold text-foreground">{regularMembers.length}<span className={`text-sm font-normal ml-0.5 ${TEXT_META}`}>명</span></p>
                        </div>
                        <div className="flex flex-col">
                            <span className={`text-[11px] ${TEXT_META}`}>게스트</span>
                            <p className="text-xl font-semibold text-foreground/70">{guestMembers.length}<span className={`text-sm font-normal ml-0.5 ${TEXT_META}`}>명</span></p>
                        </div>
                    </div>
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
                    <p className="text-sm font-medium text-foreground/90 mt-0.5">{formatYearMonth(club.createdAt)}</p>
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
                    <p className={SECTION_LABEL}>회원 ({regularMembers.length}명)</p>
                    <Link
                        href={`/clubs/${clubId}/members`}
                        className={`text-xs ${TEXT_MUTED} hover:text-foreground flex items-center gap-0.5 transition-colors`}
                    >
                        전체보기 <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
                <ClubMembersPreview members={regularMembers} maxDisplay={8} />
            </section>

            {/* 게스트 미리보기 */}
            {guestMembers.length > 0 && (
                <section className="space-y-3">
                    <p className={SECTION_LABEL}>게스트 ({guestMembers.length}명)</p>
                    <ClubMembersPreview members={guestMembers} maxDisplay={8} />
                </section>
            )}

            {/* 클럽 레이팅 랭킹 (승인 멤버에게 공개) */}
            {myMembership?.status === 'approved' && ratingRanking.length > 0 && (
                <RatingRankingCard clubId={clubId} entries={ratingRanking} />
            )}

            {/* ── 운영자/임원 전용 운영 섹션 ────────────────────────────── */}
            {isOfficerOrOwner && pendingMembers !== null && matchGameActivity !== null && activityRanking !== null && winRateRanking !== null && (
                <>
                    <hr className="border-foreground/8" />
                    <div className="space-y-8">
                        <p className={`${SECTION_LABEL} text-lg`}>클럽 운영</p>
                        <PendingMembersPanel clubId={clubId} pendingMembers={pendingMembers} />
                        <MatchGameActivityCard clubId={clubId} activity={matchGameActivity} />
                        <WinRateRankingCard
                            singles={winRateRanking.singles}
                            menDoubles={winRateRanking.menDoubles}
                            womenDoubles={winRateRanking.womenDoubles}
                            mixedDoubles={winRateRanking.mixedDoubles}
                        />
                        <ActivityRankingCard ranking={activityRanking} />
                    </div>
                </>
            )}
        </PageContainer>
    )
}

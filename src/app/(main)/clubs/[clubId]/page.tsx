import { notFound } from 'next/navigation'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/server'
import {
    getDummyClub,
    getDummyApprovedMembers,
    getDummyMyMembership,
    getDummyClubRatingRanking,
    getDummyClubPlayerRatings,
    getDummyMemberForms,
    getDummyPendingMembers,
    getDummyMatchGameActivity,
    getDummyActivityRanking,
    getDummyWinRateRanking,
} from '@/lib/redesign-fixtures/clubs'
import { ClubDetailActions } from '@/components/clubs/club-detail-actions'
import { LeaveClubButton } from '@/components/clubs/leave-club-button'
import { ClubMembersPreview } from '@/components/clubs/club-members-preview'
import { ClubAvatar } from '@/components/clubs/club-avatar'
import { PendingMembersPanel } from '@/components/club-dashboard/pending-members-panel'
import { MatchGameActivityCard } from '@/components/club-dashboard/match-game-activity-card'
import { ClubAceCard } from '@/components/club-dashboard/club-ace-card'
import { ActivityRankingCard } from '@/components/club-dashboard/activity-ranking-card'
import { ClubRankingCard } from '@/components/club-dashboard/club-ranking-card'
import {
    CARD_BASE,
    SECTION_LABEL,
    PILL_BASE,
    TEXT_MUTED,
} from '@/lib/dashboard/tokens'
import { PageContainer } from '@/components/common/page-container'
import { ProfileLink } from '@/components/common/profile-link'
import { formatYearMonth } from '@/lib/format'
import { MapPin, Settings, ChevronRight, Crown, Clock } from 'lucide-react'

type ClubPageProps = {
    params: Promise<{ clubId: string }>
}

export default async function ClubPage({ params }: ClubPageProps) {
    const { clubId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const club = getDummyClub(clubId)
    const approvedMembers = getDummyApprovedMembers(clubId)
    const myMembership = getDummyMyMembership()
    const ratingRanking = getDummyClubRatingRanking()
    const clubRatings = getDummyClubPlayerRatings()

    if (!club) notFound()

    // 클럽 랭킹용 승/패·최근폼: 승인 멤버 + 랭킹이 있을 때만 표시
    const formsByUser = myMembership?.status === 'approved' && ratingRanking.length > 0
        ? getDummyMemberForms()
        : null

    const regularMembers = approvedMembers.filter((m) => !m.user.isGuest)
    const guestMembers = approvedMembers.filter((m) => m.user.isGuest)

    const isApprovedMember = myMembership?.status === 'approved'
    const isOwner = myMembership?.role === 'owner'
    const isOfficerOrOwner = myMembership?.role === 'owner' || myMembership?.role === 'officer'
    const ownerMember = approvedMembers.find((m) => m.role === 'owner')
    const officerMembers = approvedMembers.filter((m) => m.role === 'officer')

    // 대진표 현황 · 타입별 승률 랭킹 — 승인 멤버 모두에게 공개
    const [matchGameActivity, winRateRanking] = isApprovedMember
        ? [getDummyMatchGameActivity(clubId), getDummyWinRateRanking()]
        : [null, null]
    const hasAnyAce = winRateRanking !== null && (
        winRateRanking.singles.length > 0 ||
        winRateRanking.menDoubles.length > 0 ||
        winRateRanking.womenDoubles.length > 0 ||
        winRateRanking.mixedDoubles.length > 0
    )

    // 운영자/임원인 경우에만 추가 데이터 표시
    const [pendingMembers, activityRanking] = isOfficerOrOwner
        ? [getDummyPendingMembers(clubId), getDummyActivityRanking()]
        : [null, null]

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
                                        ? 'border-win/40 text-win bg-win/10'
                                        : 'border-foreground/20 text-muted-foreground'
                                }`}
                            >
                                {club.isPublic ? '공개' : '비공개'}
                            </span>
                        </div>
                        {club.description && (
                            <p className="text-sm text-muted-foreground mt-1">{club.description}</p>
                        )}
                        <div className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs ${TEXT_MUTED} pt-0.5`}>
                            <span>정회원 <span className="font-medium text-foreground/80">{regularMembers.length}</span>명</span>
                            {guestMembers.length > 0 && (
                                <>
                                    <span>·</span>
                                    <span>게스트 <span className="font-medium text-foreground/80">{guestMembers.length}</span>명</span>
                                </>
                            )}
                            <span>·</span>
                            <span>설립 <span className="font-medium text-foreground/80">{formatYearMonth(club.createdAt)}</span></span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {!isOwner && (
                        <ClubDetailActions
                            clubId={clubId}
                            membershipStatus={myMembership?.status ?? null}
                        />
                    )}
                    {isApprovedMember && !isOwner && (
                        <LeaveClubButton clubId={clubId} clubName={club.name} />
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

            {/* 클럽 정보 카드 (운영진/지역/정기시간) — 타이틀 바로 아래 */}
            <div className={`${CARD_BASE} divide-y divide-foreground/8`}>
                {ownerMember && (
                    <div className="flex items-start gap-3 px-4 py-3">
                        <Crown className={`w-4 h-4 shrink-0 mt-0.5 ${TEXT_MUTED}`} />
                        <span className={`text-sm ${TEXT_MUTED} w-16 shrink-0 mt-0.5`}>운영진</span>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] text-foreground/90">
                            <ProfileLink
                                userId={ownerMember.userId}
                                isGuest={ownerMember.user.isGuest}
                                clubId={clubId}
                                className="font-medium hover:text-foreground"
                            >
                                {ownerMember.user.name}
                            </ProfileLink>
                            {officerMembers.map((m) => (
                                <span key={m.userId} className="flex items-center gap-1">
                                    <span className={`text-xs ${TEXT_MUTED}`}>·</span>
                                    <span className="text-[13px] text-info">임원</span>
                                    <ProfileLink
                                        userId={m.userId}
                                        isGuest={m.user.isGuest}
                                        clubId={clubId}
                                        className="font-medium hover:text-foreground"
                                    >
                                        {m.user.name}
                                    </ProfileLink>
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                {club.region && (
                    <div className="flex items-center gap-3 px-4 py-3">
                        <MapPin className={`w-4 h-4 shrink-0 ${TEXT_MUTED}`} />
                        <span className={`text-sm ${TEXT_MUTED} w-16 shrink-0`}>지역</span>
                        <span className="text-[15px] font-medium text-foreground/90">{club.region}</span>
                    </div>
                )}
                {club.courtSchedule && (
                    <div className="flex items-center gap-3 px-4 py-3">
                        <Clock className={`w-4 h-4 shrink-0 ${TEXT_MUTED}`} />
                        <span className={`text-sm ${TEXT_MUTED} w-16 shrink-0`}>정기시간</span>
                        <span className="text-[15px] font-medium text-foreground/90">{club.courtSchedule}</span>
                    </div>
                )}
            </div>

            {/* 대진표 현황 (승인 멤버에게 공개) */}
            {isApprovedMember && matchGameActivity && (
                <MatchGameActivityCard clubId={clubId} activity={matchGameActivity} />
            )}

            {/* 우리 클럽 에이스 (승인 멤버에게 공개, 타입별 승률 TOP 3) — 회원 위 */}
            {isApprovedMember && winRateRanking !== null && hasAnyAce && (
                <ClubAceCard
                    clubId={clubId}
                    singles={winRateRanking.singles}
                    menDoubles={winRateRanking.menDoubles}
                    womenDoubles={winRateRanking.womenDoubles}
                    mixedDoubles={winRateRanking.mixedDoubles}
                />
            )}

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
                <ClubMembersPreview members={regularMembers} maxDisplay={8} clubRatings={clubRatings} />
            </section>

            {/* 게스트 미리보기 */}
            {guestMembers.length > 0 && (
                <section className="space-y-3">
                    <p className={SECTION_LABEL}>게스트 ({guestMembers.length}명)</p>
                    <ClubMembersPreview members={guestMembers} maxDisplay={8} clubRatings={clubRatings} />
                </section>
            )}

            {/* 클럽 랭킹 (승인 멤버에게 공개) */}
            {isApprovedMember && ratingRanking.length > 0 && (
                <ClubRankingCard clubId={clubId} entries={ratingRanking} forms={formsByUser ?? new Map()} />
            )}

            {/* ── 운영자/임원 전용 운영 섹션 ────────────────────────────── */}
            {isOfficerOrOwner && pendingMembers !== null && activityRanking !== null && (
                <>
                    <hr className="border-foreground/8" />
                    <div className="space-y-8">
                        <p className={`${SECTION_LABEL} text-lg`}>클럽 운영</p>
                        <PendingMembersPanel clubId={clubId} pendingMembers={pendingMembers} />
                        <ActivityRankingCard clubId={clubId} ranking={activityRanking} />
                    </div>
                </>
            )}
        </PageContainer>
    )
}

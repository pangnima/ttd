import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchClubById, fetchMyMembership } from '@/lib/queries/clubs'
import {
    fetchPendingMembersByClubId,
    fetchClubMatchGameActivity,
    fetchClubActivityRanking,
    fetchClubWinRateRanking,
} from '@/lib/queries/club-dashboard'
import { PendingMembersPanel } from '@/components/club-dashboard/pending-members-panel'
import { MatchGameActivityCard } from '@/components/club-dashboard/match-game-activity-card'
import { ActivityRankingCard } from '@/components/club-dashboard/activity-ranking-card'
import { WinRateRankingCard } from '@/components/club-dashboard/win-rate-ranking-card'
import { SECTION_LABEL, TEXT_META } from '@/lib/dashboard/tokens'

type Props = {
    params: Promise<{ clubId: string }>
}

export async function generateMetadata({ params }: Props) {
    const { clubId } = await params
    const club = await fetchClubById(clubId)
    return { title: club ? `${club.name} 대시보드` : '클럽 대시보드' }
}

export default async function ClubDashboardPage({ params }: Props) {
    const { clubId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const [club, myMembership] = await Promise.all([
        fetchClubById(clubId),
        fetchMyMembership(user.id, clubId),
    ])

    if (!club) notFound()

    if (!myMembership || (myMembership.role !== 'owner' && myMembership.role !== 'officer')) {
        redirect(`/clubs/${clubId}`)
    }

    const [pendingMembers, matchGameActivity, activityRanking, winRateRanking] = await Promise.all([
        fetchPendingMembersByClubId(clubId),
        fetchClubMatchGameActivity(clubId),
        fetchClubActivityRanking(clubId),
        fetchClubWinRateRanking(clubId),
    ])

    return (
        <div className="w-full space-y-8">
            <div>
                <h1 className={`${SECTION_LABEL} text-2xl`}>{club.name}</h1>
                <p className={`text-sm ${TEXT_META} mt-1`}>클럽 대시보드</p>
            </div>

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
    )
}

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchMyClubs, fetchPendingMembersByOwner } from '@/lib/queries/clubs'
import { fetchUserById } from '@/lib/queries/users'
import { fetchPlayerStatsBundle } from '@/lib/queries/player-profile'
import { PendingApprovalBanner } from '@/components/dashboard/pending-approval-banner'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { ClubSelector } from '@/components/dashboard/club-selector'
import { PlayerStatsSection } from '@/components/profile/player-stats-section'
import { MyClubsCard } from '@/components/dashboard/my-clubs-card'

type Props = {
    searchParams: Promise<{ clubId?: string }>
}

export default async function DashboardPage({ searchParams }: Props) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const me = await fetchUserById(user.id)
    if (!me) redirect('/login')

    const { clubId: clubIdParam } = await searchParams
    const myClubs = await fetchMyClubs(user.id)
    const selectedClubId =
        clubIdParam && myClubs.some((c) => c.id === clubIdParam)
            ? clubIdParam
            : myClubs[0]?.id

    const [pendingEntries, bundle] = await Promise.all([
        fetchPendingMembersByOwner(user.id),
        fetchPlayerStatsBundle(me.id, selectedClubId),
    ])

    return (
        <div className="space-y-6">
            <PendingApprovalBanner entries={pendingEntries} />

            <DashboardHeader me={me} />

            {myClubs.length >= 2 && (
                <ClubSelector clubs={myClubs} selectedClubId={selectedClubId} />
            )}

            <PlayerStatsSection
                bundle={bundle}
                gender={me.gender}
                userId={me.id}
                privacy={me.statsHidden ? 'self' : 'public'}
                editable
                statsHidden={me.statsHidden}
            />

            <MyClubsCard clubs={myClubs} />
        </div>
    )
}

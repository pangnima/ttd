import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchMyClubs, fetchPendingMembersByOwner } from '@/lib/queries/clubs'
import { fetchMatchesByUser } from '@/lib/queries/match-games'
import { fetchUserById, fetchUsersByIds } from '@/lib/queries/users'
import {
    fetchUserMatchStatsV2,
    fetchUserDoublesCourtStats,
    fetchUserPartnerStats,
    fetchUserHeadToHead,
} from '@/lib/queries/stats'
import { PendingApprovalBanner } from '@/components/dashboard/pending-approval-banner'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { ClubSelector } from '@/components/dashboard/club-selector'
import { StatsQuadGrid } from '@/components/dashboard/stats-quad-grid'
import { DoublesCourtStatsCard } from '@/components/dashboard/doubles-court-stats'
import { RivalryPartnerCard } from '@/components/dashboard/rivalry-partner-card'
import { RecentMatchesCard } from '@/components/dashboard/recent-matches-card'
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

    const [pendingEntries, { matches, gameMetaById }, stats, court, h2h, partners] =
        await Promise.all([
            fetchPendingMembersByOwner(user.id),
            fetchMatchesByUser(user.id, selectedClubId),
            fetchUserMatchStatsV2(me.id, selectedClubId),
            fetchUserDoublesCourtStats(me.id, selectedClubId),
            fetchUserHeadToHead(me.id, selectedClubId),
            fetchUserPartnerStats(me.id, selectedClubId),
        ])

    const userIds = new Set<string>()
    for (const m of matches) {
        for (const id of [m.player1Id, m.player2Id, ...(m.team1 ?? []), ...(m.team2 ?? [])]) {
            if (id && id !== me.id) userIds.add(id)
        }
    }
    for (const r of h2h) userIds.add(r.opponentId)
    for (const p of partners) userIds.add(p.partnerId)

    const allUsers = await fetchUsersByIds([...userIds])
    const userMap = new Map(allUsers.map((u) => [u.id, u]))

    return (
        <div className="space-y-6">
            <PendingApprovalBanner entries={pendingEntries} />

            <DashboardHeader me={me} />

            {myClubs.length >= 2 && (
                <ClubSelector clubs={myClubs} selectedClubId={selectedClubId} />
            )}

            <StatsQuadGrid
                gender={me.gender}
                singles={stats.singles}
                menDoubles={stats.menDoubles}
                womenDoubles={stats.womenDoubles}
                mixedDoubles={stats.mixedDoubles}
                privacy={me.statsHidden ? 'self' : 'public'}
                editable
                statsHidden={me.statsHidden}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DoublesCourtStatsCard court={court} />
                <RivalryPartnerCard rivals={h2h} partners={partners} userMap={userMap} />
            </div>

            <RecentMatchesCard
                matches={matches}
                userId={me.id}
                userMap={userMap}
                gameMetaById={gameMetaById}
            />

            <MyClubsCard clubs={myClubs} />
        </div>
    )
}

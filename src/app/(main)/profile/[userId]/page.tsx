import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchUserById, fetchUsersByIds } from '@/lib/queries/users'
import { fetchClubById } from '@/lib/queries/clubs'
import { fetchMatchesByUser } from '@/lib/queries/match-games'
import {
    fetchUserMatchStatsV2,
    fetchUserDoublesCourtStats,
    fetchUserPartnerStats,
    fetchUserHeadToHead,
} from '@/lib/queries/stats'
import { MemberProfileHeader } from '@/components/profile/member-profile-header'
import { StatsQuadGrid } from '@/components/dashboard/stats-quad-grid'
import { DoublesCourtStatsCard } from '@/components/dashboard/doubles-court-stats'
import { RivalryPartnerCard } from '@/components/dashboard/rivalry-partner-card'
import { RecentMatchesCard } from '@/components/dashboard/recent-matches-card'
import { EMPTY_PLAYER_STATS } from '@/lib/stats'

type Props = {
    params: Promise<{ userId: string }>
    searchParams: Promise<{ clubId?: string }>
}

export default async function MemberProfilePage({ params, searchParams }: Props) {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) redirect('/login')

    const { userId } = await params
    const { clubId } = await searchParams

    const [target, club] = await Promise.all([
        fetchUserById(userId),
        clubId ? fetchClubById(clubId) : Promise.resolve(null),
    ])
    if (!target) notFound()

    const isSelf = authUser.id === userId
    const privacy = target.statsHidden
        ? (isSelf ? 'self' : 'locked')
        : 'public'

    const [{ matches, gameMetaById }, stats, court, h2h, partners] = await Promise.all([
        fetchMatchesByUser(userId, clubId),
        fetchUserMatchStatsV2(userId, clubId),
        fetchUserDoublesCourtStats(userId, clubId),
        fetchUserHeadToHead(userId, clubId),
        fetchUserPartnerStats(userId, clubId),
    ])

    const safeStats = privacy === 'locked'
        ? { singles: EMPTY_PLAYER_STATS, menDoubles: EMPTY_PLAYER_STATS, womenDoubles: EMPTY_PLAYER_STATS, mixedDoubles: EMPTY_PLAYER_STATS }
        : stats

    const userIds = new Set<string>()
    for (const m of matches) {
        for (const id of [m.player1Id, m.player2Id, ...(m.team1 ?? []), ...(m.team2 ?? [])]) {
            if (id && id !== target.id) userIds.add(id)
        }
    }
    for (const r of h2h) userIds.add(r.opponentId)
    for (const p of partners) userIds.add(p.partnerId)

    const allUsers = await fetchUsersByIds([...userIds])
    const userMap = new Map(allUsers.map((u) => [u.id, u]))

    return (
        <div className="space-y-6">
            <MemberProfileHeader
                user={target}
                clubName={club?.name}
            />

            <StatsQuadGrid
                gender={target.gender}
                singles={safeStats.singles}
                menDoubles={safeStats.menDoubles}
                womenDoubles={safeStats.womenDoubles}
                mixedDoubles={safeStats.mixedDoubles}
                privacy={privacy}
                editable={isSelf}
                statsHidden={target.statsHidden}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DoublesCourtStatsCard court={court} />
                <RivalryPartnerCard rivals={h2h} partners={partners} userMap={userMap} />
            </div>

            <RecentMatchesCard
                matches={matches}
                userId={target.id}
                userMap={userMap}
                gameMetaById={gameMetaById}
            />
        </div>
    )
}

import { StatsQuadGrid } from '@/components/dashboard/stats-quad-grid'
import { DoublesCourtStatsCard } from '@/components/dashboard/doubles-court-stats'
import { RivalryPartnerCard } from '@/components/dashboard/rivalry-partner-card'
import { RecentMatchesCard } from '@/components/dashboard/recent-matches-card'
import { EMPTY_PLAYER_STATS } from '@/lib/stats'
import type { PlayerStatsBundle } from '@/lib/queries/player-profile'
import type { User } from '@/types'

type Props = {
    bundle: PlayerStatsBundle
    gender: User['gender']
    userId: string
    privacy: 'public' | 'self' | 'locked'
    editable: boolean
    statsHidden: boolean
}

export function PlayerStatsSection({ bundle, gender, userId, privacy, editable, statsHidden }: Props) {
    const { matches, gameMetaById, stats, court, h2h, partners, userMap } = bundle

    const safeStats = privacy === 'locked'
        ? {
            singles: EMPTY_PLAYER_STATS,
            menDoubles: EMPTY_PLAYER_STATS,
            womenDoubles: EMPTY_PLAYER_STATS,
            mixedDoubles: EMPTY_PLAYER_STATS,
        }
        : stats

    return (
        <>
            <StatsQuadGrid
                gender={gender}
                singles={safeStats.singles}
                menDoubles={safeStats.menDoubles}
                womenDoubles={safeStats.womenDoubles}
                mixedDoubles={safeStats.mixedDoubles}
                privacy={privacy}
                editable={editable}
                statsHidden={statsHidden}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DoublesCourtStatsCard court={court} />
                <RivalryPartnerCard rivals={h2h} partners={partners} userMap={userMap} />
            </div>

            <RecentMatchesCard
                matches={matches}
                userId={userId}
                userMap={userMap}
                gameMetaById={gameMetaById}
            />
        </>
    )
}

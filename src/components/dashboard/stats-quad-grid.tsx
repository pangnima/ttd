import type { User } from '@/types'
import type { PlayerStats } from '@/lib/stats'
import { StatsQuadCard } from '@/components/dashboard/stats-quad-card'
import { SECTION_LABEL } from '@/lib/dashboard/tokens'

type Props = {
    gender: User['gender']
    singles: PlayerStats
    menDoubles: PlayerStats
    womenDoubles: PlayerStats
    mixedDoubles: PlayerStats
}

export function StatsQuadGrid({ gender, singles, menDoubles, womenDoubles, mixedDoubles }: Props) {
    const showMenDoubles = gender !== 'female'
    const showWomenDoubles = gender !== 'male'

    return (
        <section className="space-y-3">
            <p className={SECTION_LABEL}>내 전적 통계</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <StatsQuadCard matchType="singles" stats={singles} />
                {showMenDoubles && <StatsQuadCard matchType="men_doubles" stats={menDoubles} />}
                {showWomenDoubles && <StatsQuadCard matchType="women_doubles" stats={womenDoubles} />}
                <StatsQuadCard matchType="mixed_doubles" stats={mixedDoubles} />
            </div>
        </section>
    )
}

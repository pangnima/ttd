import type { MatchType } from '@/types'
import type { PlayerStats } from '@/lib/stats'
import { getMatchTypeStyle } from '@/lib/dashboard/match-type-style'
import { CARD_BASE, PILL_BASE } from '@/lib/dashboard/tokens'

type Props = {
    matchType: MatchType
    stats: PlayerStats
}

export function StatsQuadCard({ matchType, stats }: Props) {
    const style = getMatchTypeStyle(matchType)

    const winRateLabel =
        stats.wins + stats.losses === 0
            ? '-'
            : `${stats.winRate}%`

    return (
        <div className={`${CARD_BASE} p-4 space-y-3`}>
            <div className="flex items-center justify-between">
                <span className={`${PILL_BASE} ${style.textClass} ${style.borderClass} ${style.bgClass}`}>
                    {style.label}
                </span>
                <span className="text-xl font-bold text-foreground">
                    {winRateLabel}
                    {winRateLabel !== '-' && <span className="text-sm font-normal text-foreground/65 ml-0.5">승률</span>}
                </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                    <p className="text-lg font-bold text-foreground">{stats.wins}</p>
                    <p className="text-[10px] text-foreground/65">승</p>
                </div>
                <div>
                    <p className="text-lg font-bold text-foreground">{stats.losses}</p>
                    <p className="text-[10px] text-foreground/65">패</p>
                </div>
                <div>
                    <p className="text-lg font-bold text-foreground">{stats.draws}</p>
                    <p className="text-[10px] text-foreground/65">무</p>
                </div>
            </div>
            {(stats.setsWon > 0 || stats.setsLost > 0) && (
                <p className="text-[11px] text-foreground/55 text-right">
                    세트 {stats.setsWon} : {stats.setsLost}
                </p>
            )}
            <p className="text-[10px] text-foreground/55 text-right">
                총 {stats.totalMatches}경기
            </p>
        </div>
    )
}

import { Progress } from '@/components/ui/progress'
import { TrendingUp } from 'lucide-react'
import type { PlayerStats } from '@/lib/stats'
import type { MatchType } from '@/types'

type StatsCardsProps = {
    stats: PlayerStats
}

const matchTypeLabel: Record<MatchType, string> = {
    singles:       '단식',
    men_doubles:   '남복',
    women_doubles: '여복',
    mixed_doubles: '혼복',
}

export function StatsCards({ stats }: StatsCardsProps) {
    const { wins, losses, totalMatches, winRate, setsWon, setsLost, byMatchType } = stats

    return (
        <div className="space-y-3">
            {/* 기본 통계 4종 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: '총 경기', value: totalMatches, color: '' },
                    { label: '승',      value: wins,         color: 'text-emerald-400' },
                    { label: '패',      value: losses,       color: 'text-red-400' },
                    { label: '세트',    value: `${setsWon}/${setsLost}`, color: 'text-muted-foreground' },
                ].map(({ label, value, color }) => (
                    <div key={label} className="border rounded-lg p-4 text-center space-y-1 border-white/5">
                        <p className={`text-2xl font-bold ${color}`}>{value}</p>
                        <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                ))}
            </div>

            {/* 승률 프로그레스 */}
            <div className="border rounded-lg p-4 space-y-2 border-white/5">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                        승률
                    </span>
                    <span className="text-2xl font-bold text-blue-400">{winRate}%</span>
                </div>
                <Progress value={winRate} className="h-2" />
                {totalMatches === 0 && (
                    <p className="text-xs text-muted-foreground">아직 경기 기록이 없습니다.</p>
                )}
            </div>

            {/* 종목별 통계 */}
            {byMatchType.length > 0 && (
                <div className="border rounded-lg overflow-hidden border-white/5">
                    <div className="px-4 py-2.5 border-b border-white/5 bg-muted/30">
                        <p className="text-xs font-medium text-muted-foreground">종목별 통계</p>
                    </div>
                    <div className="divide-y divide-white/5">
                        {byMatchType.map((mt) => (
                            <div key={mt.matchType} className="flex items-center justify-between px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{matchTypeLabel[mt.matchType]}</span>
                                    <span className="text-xs text-muted-foreground">{mt.totalMatches}경기</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <span className="text-emerald-400 font-medium">{mt.wins}승</span>
                                    <span className="text-red-400">{mt.losses}패</span>
                                    <span className="w-12 text-right text-blue-400 font-medium">{mt.winRate}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

import type { SurfaceStats } from '@/lib/analytics/surface'
import { SURFACE_LABELS } from '@/lib/dashboard/surface'
import { SectionCard } from '@/components/common/section-card'

type Props = {
    surfaceStats: SurfaceStats
}

export function SurfaceStatsCard({ surfaceStats }: Props) {
    const entries = (Object.entries(surfaceStats) as [keyof SurfaceStats, SurfaceStats[keyof SurfaceStats]][])
        .filter(([, wl]) => wl.total > 0)
        .sort(([, a], [, b]) => b.total - a.total)

    return (
        <SectionCard
            title="코트 표면별 성적"
            isEmpty={entries.length === 0}
            emptyMessage="경기 데이터가 없습니다"
            contentClass="p-4 space-y-3"
        >
            {entries.map(([surface, wl]) => (
                <div key={surface} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">{SURFACE_LABELS[surface] ?? surface}</span>
                        <span className="text-muted-foreground tabular-nums">
                            {wl.wins}승 {wl.losses}패{wl.draws > 0 ? ` ${wl.draws}무` : ''} · {wl.winRate}%
                        </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                            className="h-full rounded-full bg-cyan-600 dark:bg-cyan-400/70 transition-all"
                            style={{ width: `${wl.winRate}%` }}
                        />
                    </div>
                </div>
            ))}
        </SectionCard>
    )
}

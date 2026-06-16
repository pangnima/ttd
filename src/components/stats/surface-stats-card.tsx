import type { SurfaceStats } from '@/lib/analytics/surface'
import { SURFACE_LABELS, SURFACE_BAR_CLASS } from '@/lib/dashboard/surface'
import { SectionCard } from '@/components/common/section-card'
import { StatBarRow } from '@/components/stats/stat-bar-row'

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
                <StatBarRow
                    key={surface}
                    label={SURFACE_LABELS[surface] ?? surface}
                    total={wl.total}
                    wins={wl.wins}
                    losses={wl.losses}
                    draws={wl.draws}
                    winRate={wl.winRate}
                    barClass={SURFACE_BAR_CLASS[surface] ?? 'bg-info'}
                />
            ))}
        </SectionCard>
    )
}

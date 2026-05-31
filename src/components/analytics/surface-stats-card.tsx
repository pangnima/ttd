import type { SurfaceStats } from '@/lib/analytics/surface'
import { CARD_BASE, SECTION_LABEL } from '@/lib/dashboard/tokens'

type Props = {
    surfaceStats: SurfaceStats
}

const SURFACE_LABELS: Record<string, string> = {
    hard: '하드',
    clay: '클레이',
    grass: '잔디',
    other: '기타',
    unknown: '미지정',
}

export function SurfaceStatsCard({ surfaceStats }: Props) {
    const entries = (Object.entries(surfaceStats) as [keyof SurfaceStats, SurfaceStats[keyof SurfaceStats]][])
        .filter(([, wl]) => wl.total > 0)
        .sort(([, a], [, b]) => b.total - a.total)

    if (entries.length === 0) {
        return (
            <section className="space-y-3">
                <p className={SECTION_LABEL}>코트 표면별 성적</p>
                <div className={`${CARD_BASE} p-4 text-sm text-muted-foreground text-center py-8`}>
                    경기 데이터가 없습니다
                </div>
            </section>
        )
    }

    return (
        <section className="space-y-3">
            <p className={SECTION_LABEL}>코트 표면별 성적</p>
            <div className={`${CARD_BASE} p-4 space-y-3`}>
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
            </div>
        </section>
    )
}

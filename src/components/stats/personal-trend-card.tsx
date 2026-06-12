import { SectionCard } from '@/components/common/section-card'
import { TEXT_MUTED } from '@/lib/dashboard/tokens'
import type { ResultTimeline } from '@/lib/analytics/trend'

type Props = {
    timeline: ResultTimeline
}

// 전적 추세 (누적 승−패 스파크라인, 무의존). 클럽 레이팅 추세 자리를 비클럽 scope에서 대체.
export function PersonalTrendCard({ timeline }: Props) {
    const isEmpty = timeline.games === 0

    return (
        <SectionCard
            title="전적 추세"
            isEmpty={isEmpty}
            emptyMessage="기록된 경기가 없습니다"
            headerRight={!isEmpty ? <span className={`text-xs ${TEXT_MUTED}`}>누적 승−패</span> : undefined}
        >
            {!isEmpty && <TrendBody timeline={timeline} />}
        </SectionCard>
    )
}

function TrendBody({ timeline }: { timeline: ResultTimeline }) {
    const { series, games, finalNet } = timeline
    const min = Math.min(...series)
    const max = Math.max(...series)
    const range = max - min || 1
    const W = 300
    const H = 64
    const padX = 4
    const padY = 8
    const stepX = (W - padX * 2) / (series.length - 1 || 1)
    const pts = series.map((v, i) => {
        const x = padX + i * stepX
        const y = padY + (1 - (v - min) / range) * (H - padY * 2)
        return { x, y }
    })
    const coords = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    // 라인 아래 코트그린 area-fill
    const areaD = `M ${pts[0].x.toFixed(1)},${(H - padY).toFixed(1)} ` +
        pts.map((p) => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
        ` L ${pts[pts.length - 1].x.toFixed(1)},${(H - padY).toFixed(1)} Z`
    const sign = finalNet > 0 ? '+' : ''

    return (
        <div className="space-y-3">
            <div className="flex items-end justify-between gap-2">
                <span className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold tabular-nums text-foreground">{sign}{finalNet}</span>
                    <span className={`text-[11px] ${TEXT_MUTED}`}>현재 누적</span>
                </span>
                <span className={`text-[11px] ${TEXT_MUTED}`}>{games}경기</span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16" preserveAspectRatio="none" role="img" aria-label="전적 추세">
                <defs>
                    <linearGradient id="personal-trend-area" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--win)" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="var(--win)" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <path d={areaD} fill="url(#personal-trend-area)" stroke="none" />
                <polyline
                    points={coords}
                    fill="none"
                    className="stroke-win"
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                />
            </svg>
            <div className={`flex justify-between text-[11px] ${TEXT_MUTED}`}>
                <span>시작 0</span>
                <span>현재 {sign}{finalNet}</span>
            </div>
        </div>
    )
}

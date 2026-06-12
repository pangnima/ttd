import { SectionCard } from '@/components/common/section-card'
import { TierEmblem } from '@/components/common/tier-emblem'
import { TierDeltaBadge } from '@/components/common/tier-delta-badge'
import { TIER_LABELS, getTier } from '@/lib/rating/tier'
import { TEXT_MUTED } from '@/lib/dashboard/tokens'
import type { RatingHistoryPoint } from '@/lib/queries/ratings'

type Props = {
    points: RatingHistoryPoint[]
    clubName?: string
}

// 클럽 레이팅 시간순 추세 (SVG 스파크라인, 무의존). docs/rating-system.md §5.
export function ClubRatingTrendCard({ points, clubName }: Props) {
    const isEmpty = points.length === 0

    return (
        <SectionCard
            title="클럽 레이팅 추세"
            isEmpty={isEmpty}
            emptyMessage="확정된 클럽 경기가 없습니다"
            headerRight={clubName ? <span className={`text-xs ${TEXT_MUTED}`}>{clubName}</span> : undefined}
        >
            {!isEmpty && <TrendBody points={points} />}
        </SectionCard>
    )
}

function TrendBody({ points }: { points: RatingHistoryPoint[] }) {
    const start = points[0].ratingBefore
    const current = points[points.length - 1].ratingAfter
    const matchesPlayed = points.length

    // 시작 레이팅 → 각 경기 후 레이팅을 잇는 시계열.
    const series = [start, ...points.map((p) => p.ratingAfter)]
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

    return (
        <div className="space-y-3">
            <div className="flex items-end justify-between gap-2">
                <div className="flex items-center gap-3">
                    <TierEmblem rating={current} matchesPlayed={matchesPlayed} />
                    <TierDeltaBadge before={start} after={current} />
                </div>
                <span className={`text-[11px] ${TEXT_MUTED}`}>{matchesPlayed}경기</span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16" preserveAspectRatio="none" role="img" aria-label="클럽 레이팅 추세">
                <defs>
                    <linearGradient id="trend-area" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--win)" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="var(--win)" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <path d={areaD} fill="url(#trend-area)" stroke="none" />
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
                <span>시작 {TIER_LABELS[getTier(start)]}</span>
                <span>현재 {TIER_LABELS[getTier(current)]}</span>
            </div>
        </div>
    )
}

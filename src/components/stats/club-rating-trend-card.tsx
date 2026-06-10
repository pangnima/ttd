import { SectionCard } from '@/components/common/section-card'
import { ProvisionalBadge } from '@/components/common/provisional-badge'
import { formatClubRating, isProvisional } from '@/lib/rating/display'
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
    const change = current - start
    const matchesPlayed = points.length
    const up = change >= 0

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
    const coords = series
        .map((v, i) => {
            const x = padX + i * stepX
            const y = padY + (1 - (v - min) / range) * (H - padY * 2)
            return `${x.toFixed(1)},${y.toFixed(1)}`
        })
        .join(' ')

    return (
        <div className="space-y-3">
            <div className="flex items-end justify-between gap-2">
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono tabular-nums text-foreground">
                        {formatClubRating(current)}
                    </span>
                    <span className={`text-sm font-mono ${up ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {up ? '▲' : '▼'}{Math.abs(change).toFixed(3)}
                    </span>
                    {isProvisional(matchesPlayed) && <ProvisionalBadge />}
                </div>
                <span className={`text-[11px] ${TEXT_MUTED}`}>{matchesPlayed}경기</span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16" preserveAspectRatio="none" role="img" aria-label="클럽 레이팅 추세">
                <polyline
                    points={coords}
                    fill="none"
                    className="stroke-cyan-500 dark:stroke-cyan-400"
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                />
            </svg>
            <div className={`flex justify-between text-[11px] ${TEXT_MUTED} font-mono`}>
                <span>시작 {formatClubRating(start)}</span>
                <span>현재 {formatClubRating(current)}</span>
            </div>
        </div>
    )
}

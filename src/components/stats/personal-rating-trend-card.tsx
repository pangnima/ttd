import { SectionCard } from '@/components/common/section-card'
import { TierEmblem } from '@/components/common/tier-emblem'
import { TierDeltaBadge } from '@/components/common/tier-delta-badge'
import { TIER_LABELS, getTier } from '@/lib/rating/tier'
import { TEXT_MUTED } from '@/lib/dashboard/tokens'
import type { PersonalRatingPoint } from '@/lib/rating/personal-rating'

type Props = {
    points: PersonalRatingPoint[]
    provisional?: boolean
}

// 개인 경기 레이팅 시간순 추세 (SVG 스파크라인, 무의존). ClubRatingTrendCard 패턴 재사용.
// docs/rating-system.md §9. 클럽 레이팅과 별개의 "개인전 기준" 지표.
export function PersonalRatingTrendCard({ points, provisional }: Props) {
    const isEmpty = points.length === 0

    return (
        <SectionCard
            title="개인 레이팅 추세"
            isEmpty={isEmpty}
            emptyMessage="기록된 개인 경기가 없습니다"
            headerRight={<span className={`text-caption ${TEXT_MUTED}`}>개인전 기준</span>}
        >
            {!isEmpty && <TrendBody points={points} provisional={provisional} />}
        </SectionCard>
    )
}

function TrendBody({ points, provisional }: { points: PersonalRatingPoint[]; provisional?: boolean }) {
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
                    <TierEmblem rating={current} provisional={provisional} />
                    <TierDeltaBadge before={start} after={current} />
                </div>
                <span className={`text-caption ${TEXT_MUTED}`}>{matchesPlayed}경기</span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16" preserveAspectRatio="none" role="img" aria-label="개인 레이팅 추세">
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
            <div className={`flex justify-between text-caption ${TEXT_MUTED}`}>
                <span>시작 {TIER_LABELS[getTier(start)]}</span>
                <span>현재 {TIER_LABELS[getTier(current)]}</span>
            </div>
        </div>
    )
}

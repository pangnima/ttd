import { cn } from '@/lib/utils'

/**
 * Baseline 승률 도넛 — 코트그린 링 + 중앙 % 라벨.
 * value: 0~100 (null이면 데이터 없음 처리)
 */
type WinRateDonutProps = {
    value: number | null
    size?: number
    strokeWidth?: number
    label?: string
    className?: string
}

export function WinRateDonut({
    value,
    size = 96,
    strokeWidth = 10,
    label = '승률',
    className,
}: WinRateDonutProps) {
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const pct = value ?? 0
    const dash = (pct / 100) * circumference

    return (
        <div
            className={cn('relative inline-flex items-center justify-center', className)}
            style={{ width: size, height: size }}
        >
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    strokeWidth={strokeWidth}
                    className="stroke-muted"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${circumference}`}
                    className="stroke-win transition-[stroke-dasharray] duration-500"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="type-display text-foreground tabular-nums" style={{ fontSize: size * 0.26 }}>
                    {value === null ? '–' : `${value}%`}
                </span>
                <span className="type-mono-label text-muted-foreground">{label}</span>
            </div>
        </div>
    )
}

import { calcWinRate } from '@/lib/dashboard/tokens'

type Props = {
    wins: number
    losses: number
    draws?: number
    /** 링 지름(px) */
    size?: number
}

/**
 * 승률 도넛 링 — 의존성 없는 순수 SVG.
 * 클럽 티어 방패가 없는 개인·전체 scope 헤더의 좌측 히어로 슬롯을 채운다.
 */
export function WinRateRing({ wins, losses, draws = 0, size = 116 }: Props) {
    const rate = calcWinRate(wins, losses) // number | null (무승부 제외 분모, 경기 없으면 null)
    const pct = rate ?? 0
    const stroke = 9
    const r = (size - stroke) / 2
    const circumference = 2 * Math.PI * r
    const dash = (pct / 100) * circumference
    const center = size / 2

    return (
        <div className="flex flex-col items-center gap-1 shrink-0 self-center sm:self-auto">
            <div className="relative" style={{ width: size, height: size }}>
                <svg
                    width={size}
                    height={size}
                    viewBox={`0 0 ${size} ${size}`}
                    className="-rotate-90"
                    role="img"
                    aria-label={`승률 ${pct}%`}
                >
                    <circle cx={center} cy={center} r={r} fill="none" className="stroke-muted" strokeWidth={stroke} />
                    <circle
                        cx={center}
                        cy={center}
                        r={r}
                        fill="none"
                        className="stroke-win"
                        strokeWidth={stroke}
                        strokeLinecap="round"
                        strokeDasharray={`${dash.toFixed(1)} ${circumference.toFixed(1)}`}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold tabular-nums text-foreground leading-none">
                        {rate === null ? '–' : `${pct}%`}
                    </span>
                    <span className="text-[11px] text-muted-foreground mt-0.5">승률</span>
                </div>
            </div>
            <span className="text-xs tabular-nums">
                <span className="text-win font-semibold">{wins}승</span>{' '}
                <span className="text-loss font-semibold">{losses}패</span>
                {draws > 0 && <span className="text-muted-foreground"> {draws}무</span>}
            </span>
        </div>
    )
}

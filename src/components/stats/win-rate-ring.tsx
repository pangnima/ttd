import { calcWinRate } from '@/lib/dashboard/tokens'
import { cn } from '@/lib/utils'

type Props = {
    wins: number
    losses: number
    draws?: number
    /** 링 지름(px) */
    size?: number
}

/**
 * 승률 도넛 링 — 의존성 없는 순수 SVG.
 * 링은 전체 경기(승/패/무) 구성 비율로 분할되고, 중앙은 무승부 제외 승률을 표시한다.
 * 하단에는 구분선 + 색상 범례(승/패/무 개수)를 둔다. 클럽 티어 방패가 없는
 * 전체·개인 scope 헤더의 좌측 히어로 슬롯을 채운다.
 */
export function WinRateRing({ wins, losses, draws = 0, size = 148 }: Props) {
    const rate = calcWinRate(wins, losses) // number | null (무승부 제외 분모, 경기 없으면 null)
    const pct = rate ?? 0
    const total = wins + losses + draws
    const stroke = 15
    const r = (size - stroke) / 2
    const circ = 2 * Math.PI * r
    const center = size / 2

    // 값이 있는 세그먼트만 승→패→무 순으로 12시부터 시계방향 배치
    const segs = [
        { value: wins, color: 'stroke-win' },
        { value: losses, color: 'stroke-loss' },
        { value: draws, color: 'stroke-muted-foreground' },
    ].filter((s) => s.value > 0)

    // 세그먼트가 2개 이상일 때만 사이 간격을 줘 round cap으로 시각 분리
    const gap = segs.length > 1 ? circ * 0.014 : 0
    let offset = 0
    const arcs = segs.map((s, i) => {
        const len = total > 0 ? (s.value / total) * circ : 0
        const dash = Math.max(len - gap, 0.1)
        const node = (
            <circle
                key={i}
                cx={center}
                cy={center}
                r={r}
                fill="none"
                className={s.color}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={`${dash.toFixed(1)} ${(circ - dash).toFixed(1)}`}
                strokeDashoffset={(-offset).toFixed(1)}
            />
        )
        offset += len
        return node
    })

    const legend = [
        { label: '승', value: wins, dot: 'bg-win', text: 'text-win' },
        { label: '패', value: losses, dot: 'bg-loss', text: 'text-loss' },
        ...(draws > 0 ? [{ label: '무', value: draws, dot: 'bg-muted-foreground', text: 'text-muted-foreground' }] : []),
    ]

    return (
        <div className="flex flex-col items-center gap-4 shrink-0 self-center sm:self-auto">
            <div className="relative" style={{ width: size, height: size }}>
                <svg
                    width={size}
                    height={size}
                    viewBox={`0 0 ${size} ${size}`}
                    className="-rotate-90"
                    role="img"
                    aria-label={`승률 ${pct}% (승 ${wins} 패 ${losses}${draws > 0 ? ` 무 ${draws}` : ''})`}
                >
                    <circle cx={center} cy={center} r={r} fill="none" className="stroke-muted" strokeWidth={stroke} />
                    {total > 0 && arcs}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold tabular-nums text-foreground leading-none">
                        {rate === null ? '–' : `${pct}%`}
                    </span>
                    <span className="mt-1 text-[10px] font-medium tracking-wider text-muted-foreground">승률</span>
                </div>
            </div>
            <div
                className="grid divide-x divide-border border-t border-border pt-3"
                style={{ gridTemplateColumns: `repeat(${legend.length}, minmax(0, 1fr))`, minWidth: size }}
            >
                {legend.map((l) => (
                    <div key={l.label} className="flex flex-col items-center gap-0.5 px-6">
                        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <span className={cn('h-1.5 w-1.5 rounded-full', l.dot)} />
                            {l.label}
                        </span>
                        <span className={cn('text-xl font-bold tabular-nums', l.text)}>{l.value}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

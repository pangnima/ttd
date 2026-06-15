import type { TrendStatsResult } from '@/lib/analytics/trend-stats'

type Props = {
    result: TrendStatsResult
    // 지정 시 포인트당 최소 px 폭을 강제 → 컨테이너가 좁으면 가로 스크롤(주간 전용).
    // 미지정(일간·월간)이면 컨테이너 폭에 맞춰 가득 채운다(스크롤 없음).
    minPointWidth?: number
}

const VB_H = 100         // viewBox 세로 단위(실제 높이는 카드 높이에 맞춰 늘어남)
const POINT_UNIT = 40    // viewBox 가로 단위/포인트(실제 폭은 카드에 맞춰 늘어남)
const PAD_X = 6
const TOP = 18           // 상단 여백(승률 수치 공간)
const BOT = 6
const CHART_H = VB_H - TOP - BOT

// 승률(라인) + 경기수(바) 복합 차트. 순수 SVG(무의존). 일간/주간/월간 공용.
// - 차트는 카드의 가용 높이를 flex로 가득 채운다.
// - minPointWidth가 있으면(주간) 포인트당 최소 폭을 확보해 좁은 화면에서 가로 스크롤.
// - SVG는 가로·세로를 비균일 스케일로 채우므로(preserveAspectRatio=none),
//   왜곡되면 안 되는 텍스트·마커는 SVG 밖 HTML(% 좌표)로 그린다.
export function WinRateTrendBody({ result, minPointWidth }: Props) {
    const { points, maxTotal } = result
    const n = points.length

    const contentW = n * POINT_UNIT     // viewBox 가로 단위
    const innerW = contentW - PAD_X * 2
    const slot = innerW / n
    const barW = Math.min(slot * 0.5, 22)

    const xOf = (i: number) => PAD_X + slot * (i + 0.5)
    const yOf = (winRate: number) => TOP + (1 - winRate / 100) * CHART_H
    const leftPct = (i: number) => `${(xOf(i) / contentW) * 100}%`

    const line = points.map((p, i) => `${xOf(i).toFixed(1)},${yOf(p.winRate).toFixed(1)}`).join(' ')

    return (
        <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 min-h-[220px] overflow-x-auto">
                {/* 넓은 카드는 채우고(스크롤 X), minPointWidth가 있으면 좁을 때 스크롤(주간) */}
                <div
                    className="h-full flex flex-col"
                    style={minPointWidth ? { minWidth: `${n * minPointWidth}px` } : undefined}
                >
                    {/* 차트 영역(높이 가변) */}
                    <div className="relative flex-1 min-h-0">
                        <svg
                            viewBox={`0 0 ${contentW} ${VB_H}`}
                            preserveAspectRatio="none"
                            className="absolute inset-0 h-full w-full"
                            role="img"
                            aria-label="승률 추이"
                        >
                            {points.map((p, i) => {
                                const h = maxTotal > 0 ? (p.total / maxTotal) * CHART_H : 0
                                const x = xOf(i) - barW / 2
                                const y = TOP + (CHART_H - h)
                                return <rect key={`b${p.key}`} x={x} y={y} width={barW} height={h} rx={1} className="fill-muted" />
                            })}
                            {n > 1 && (
                                <polyline
                                    points={line}
                                    fill="none"
                                    className="stroke-win"
                                    strokeWidth={2}
                                    strokeLinejoin="round"
                                    strokeLinecap="round"
                                    vectorEffect="non-scaling-stroke"
                                />
                            )}
                        </svg>

                        {/* 포인트 마커 + 승률 수치 (HTML — 왜곡 없음) */}
                        {points.map((p, i) => (
                            <div
                                key={`m${p.key}`}
                                className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-win"
                                style={{ left: leftPct(i), top: `${yOf(p.winRate)}%` }}
                            />
                        ))}
                        {points.map((p, i) => (
                            p.total > 0 ? (
                                <span
                                    key={`v${p.key}`}
                                    className="absolute -translate-x-1/2 -translate-y-full text-[10px] font-semibold text-foreground whitespace-nowrap"
                                    style={{ left: leftPct(i), top: `${yOf(p.winRate) - 2}%` }}
                                >
                                    {p.winRate}
                                </span>
                            ) : null
                        ))}
                    </div>

                    {/* x축 라벨 (HTML — 차트와 함께 스크롤) */}
                    <div className="mt-1 flex shrink-0">
                        {points.map((p) => (
                            <span key={`x${p.key}`} className="min-w-0 flex-1 text-center text-[10px] text-muted-foreground">
                                {p.label}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

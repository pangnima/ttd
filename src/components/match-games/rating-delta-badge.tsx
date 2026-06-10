// 경기별 클럽 레이팅 변동폭 인라인 표시 (▲ 상승 / ▼ 하락, 소수점 3자리).
// 0 또는 undefined면 아무것도 렌더하지 않는다.
export function RatingDeltaBadge({ delta }: { delta?: number }) {
    if (delta === undefined || delta === 0) return null
    const up = delta > 0
    return (
        <span
            className={`text-[10px] font-mono shrink-0 ${up ? 'text-emerald-500' : 'text-rose-500'}`}
        >
            {up ? '▲' : '▼'}{Math.abs(delta).toFixed(3)}
        </span>
    )
}

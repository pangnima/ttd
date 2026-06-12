import { getTierDelta, TIER_LABELS } from '@/lib/rating/tier'

type Props = {
    before?: number
    after?: number
}

// 경기 전/후 클럽 레이팅 → 포인트 변동(▲Np / ▼Np) 또는 계급 변동(승급/강등) 인라인 표시.
// 변동이 없거나 값이 없으면 아무것도 렌더하지 않는다.
export function TierDeltaBadge({ before, after }: Props) {
    if (before === undefined || after === undefined) return null
    const { toTier, pointDelta, promoted, demoted } = getTierDelta(before, after)

    if (promoted || demoted) {
        const up = promoted
        return (
            <span className={`text-[10px] font-medium shrink-0 ${up ? 'text-win' : 'text-loss'}`}>
                {up ? '▲' : '▼'}{TIER_LABELS[toTier]} {up ? '승급' : '강등'}
            </span>
        )
    }

    if (pointDelta === 0) return null
    const up = pointDelta > 0
    return (
        <span className={`text-[10px] font-mono shrink-0 ${up ? 'text-win' : 'text-loss'}`}>
            {up ? '▲' : '▼'}{Math.abs(pointDelta)}p
        </span>
    )
}

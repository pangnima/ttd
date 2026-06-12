import { TierIcon } from '@/components/common/tier-icon'
import { isProvisional } from '@/lib/rating/display'
import { getTierProgress, TIER_LABELS, TIER_TEXT } from '@/lib/rating/tier'
import { cn } from '@/lib/utils'

type Props = {
    rating: number
    /** 잠정 판정용 경기 수. provisional을 직접 넘기면 생략 가능. */
    matchesPlayed?: number
    /** 잠정 여부 직접 지정 (matchesPlayed보다 우선). */
    provisional?: boolean
    /** 아이콘 높이(px). 기본 28. */
    size?: number
    /** 계급 이름 노출 (기본 true). 조밀한 곳에서 false. */
    showLabel?: boolean
    /** `{points}p` 노출 (기본 true). */
    showPoints?: boolean
    /** 잠정 표시 (기본 true). 조밀한 곳에서 false. */
    showProvisional?: boolean
    className?: string
}

// 가로형 계급 엠블럼: [아이콘] 계급이름 84p. 아이콘으로 계급을 식별하고 이름·계급색 포인트를 병기.
export function TierEmblem({
    rating, matchesPlayed, provisional, size = 28,
    showLabel = true, showPoints = true, showProvisional = true, className,
}: Props) {
    const { tier, points } = getTierProgress(rating)
    const isProv = showProvisional && (provisional ?? (matchesPlayed !== undefined && isProvisional(matchesPlayed)))
    return (
        <span title={TIER_LABELS[tier]} className={cn('inline-flex items-center gap-1.5', className)}>
            <TierIcon tier={tier} size={size} />
            {showLabel && <span className="text-sm font-medium text-foreground">{TIER_LABELS[tier]}</span>}
            {showPoints && (
                <span className={cn('text-xs font-mono tabular-nums font-semibold', TIER_TEXT[tier])}>{points}p</span>
            )}
            {isProv && <span className="text-[10px] text-amber-500">잠정</span>}
        </span>
    )
}

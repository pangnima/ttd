import { TierIcon } from '@/components/common/tier-icon'
import { isProvisional } from '@/lib/rating/display'
import { getNextTier, getTierProgress, TIER_LABELS, TIER_TEXT } from '@/lib/rating/tier'
import { cn } from '@/lib/utils'

type Props = {
    rating: number
    /** 잠정 판정용 경기 수. provisional을 직접 넘기면 생략 가능. */
    matchesPlayed?: number
    /** 잠정 여부 직접 지정 (matchesPlayed보다 우선). */
    provisional?: boolean
}

// 진척도 바: 등급명 + 0~100P + 티어색 그라데이션 바 + 다음 등급까지 남은 P.
export function ProfileTierProgress({ rating, matchesPlayed, provisional }: Props) {
    const { tier, points, pointsToPromote } = getTierProgress(rating)
    const nextTier = getNextTier(tier)
    const isProv = provisional ?? (matchesPlayed !== undefined && isProvisional(matchesPlayed))

    return (
        <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
                <span className="flex items-center gap-1.5">
                    <span className={cn('text-base font-bold', TIER_TEXT[tier])}>{TIER_LABELS[tier]}</span>
                    {isProv && <span className="text-[10px] text-amber-500">잠정</span>}
                </span>
                <span className="text-sm font-mono tabular-nums text-muted-foreground">
                    <span className={cn('font-semibold', TIER_TEXT[tier])}>{points}</span> / 100 P
                </span>
            </div>

            {/* 코트 표면별 성적 바와 동일 색상(bg-muted 트랙 + bg-info 채움) */}
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                    className="h-full rounded-full bg-info transition-all"
                    style={{ width: `${Math.max(points, 2)}%` }}
                />
            </div>

            {nextTier && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    다음 등급
                    <TierIcon tier={nextTier} size={16} />
                    <span className="font-medium text-foreground">{TIER_LABELS[nextTier]}</span>
                    까지 <span className="font-mono tabular-nums font-semibold text-foreground">{pointsToPromote}P</span>
                </p>
            )}
        </div>
    )
}

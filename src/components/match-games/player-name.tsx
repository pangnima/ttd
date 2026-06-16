import { TierIcon } from '@/components/common/tier-icon'
import { TierDeltaBadge } from '@/components/common/tier-delta-badge'
import { DEFAULT_RATING } from '@/lib/rating/constants'
import { cn } from '@/lib/utils'
import type { RatingChange } from '@/lib/queries/ratings'

// 대진표 선수 1명 표기 — 티어 아이콘 + 이름 + (확정 시) 레이팅 변동 배지.
// 승/패에 따라 이름 색을 win/loss로 칠한다. 단식·복식·모바일 카드 공용으로 표기 로직을 단일화.
export type PlayerOutcome = 'win' | 'loss' | 'draw' | null

type PlayerNameProps = {
    name: string
    // 클럽 레이팅. 행이 없는 멤버/게스트는 미지정 → 기본 골드(2.5)로 노출.
    rating?: number
    outcome: PlayerOutcome
    // 확정 대진표에서만 표시되는 경기 전/후 레이팅 변동.
    delta?: RatingChange
    showDelta?: boolean
    className?: string
}

// 승=코트그린, 패=클레이, 무/미확정=중립.
function outcomeClass(outcome: PlayerOutcome): string {
    if (outcome === 'win') return 'text-win font-bold'
    if (outcome === 'loss') return 'text-loss'
    return 'text-foreground/85'
}

export function PlayerName({ name, rating, outcome, delta, showDelta, className }: PlayerNameProps) {
    return (
        <span className={cn('text-sm inline-flex items-center gap-1', outcomeClass(outcome), className)}>
            <TierIcon rating={rating ?? DEFAULT_RATING} size={14} className="shrink-0" />
            {name}
            {showDelta && <TierDeltaBadge before={delta?.before} after={delta?.after} />}
        </span>
    )
}

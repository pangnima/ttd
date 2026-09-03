import { Badge } from '@/components/ui/badge'
import { MATCH_TYPE_LABELS, getMatchTypeBadgeClass } from '@/lib/dashboard/match-type-style'
import { cn } from '@/lib/utils'
import type { MatchType } from '@/types'

export type ProfileSummary = {
    winRate: number
    wins: number
    losses: number
    draws: number
    /** 가장 많이 뛴 경기 종류 (경기 0이면 undefined) */
    topMatchType?: MatchType
}

// 비클럽 scope 헤더 보조 행: 경기 수 · 주력 종목. (연승은 최근 폼 스트립이 시각적으로 대체)
export function ProfileSummaryRow({ wins, losses, draws, topMatchType }: ProfileSummary) {
    const games = wins + losses + draws

    return (
        <div className="flex items-center gap-4 text-body2 flex-wrap">
            <span className="flex items-baseline gap-1">
                <span className="text-h4 font-bold tabular-nums text-foreground">{games}</span>
                <span className="text-caption text-muted-foreground">경기</span>
            </span>

            {topMatchType && (
                <>
                    <span className="h-4 w-px bg-border" aria-hidden />
                    <span className="flex items-center gap-1.5">
                        <span className="text-caption text-muted-foreground">주력</span>
                        <Badge variant="outline" className={cn('text-caption', getMatchTypeBadgeClass(topMatchType))}>
                            {MATCH_TYPE_LABELS[topMatchType]}
                        </Badge>
                    </span>
                </>
            )}
        </div>
    )
}

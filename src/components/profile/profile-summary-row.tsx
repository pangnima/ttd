import { Badge } from '@/components/ui/badge'
import { MATCH_TYPE_LABELS, getMatchTypeBadgeClass } from '@/lib/dashboard/match-type-style'
import { cn } from '@/lib/utils'
import type { MatchType } from '@/types'

export type ProfileSummary = {
    winRate: number
    wins: number
    losses: number
    draws: number
    /** 최근 경기 기준 현재 연속 기록 (없으면 null) */
    streak: { type: 'W' | 'L' | 'D'; length: number } | null
    /** 가장 많이 뛴 경기 종류 (경기 0이면 undefined) */
    topMatchType?: MatchType
}

const STREAK_META: Record<'W' | 'L', { label: string; cls: string }> = {
    W: { label: '연승', cls: 'text-win' },
    L: { label: '연패', cls: 'text-loss' },
}

// 비클럽 scope 헤더 보조 행: 경기 수 · 현재 연승/연패 · 주력 종목.
export function ProfileSummaryRow({ wins, losses, draws, streak, topMatchType }: ProfileSummary) {
    const games = wins + losses + draws
    const streakMeta = streak && streak.type !== 'D' ? STREAK_META[streak.type] : null

    return (
        <div className="flex items-center gap-4 text-sm flex-wrap">
            <span className="flex items-baseline gap-1">
                <span className="text-lg font-bold tabular-nums text-foreground">{games}</span>
                <span className="text-xs text-muted-foreground">경기</span>
            </span>

            {streakMeta && streak && streak.length > 0 && (
                <>
                    <span className="h-4 w-px bg-border" aria-hidden />
                    <span className="flex items-baseline gap-1">
                        <span className={cn('text-lg font-bold tabular-nums', streakMeta.cls)}>{streak.length}</span>
                        <span className="text-xs text-muted-foreground">현재 {streakMeta.label}</span>
                    </span>
                </>
            )}

            {topMatchType && (
                <>
                    <span className="h-4 w-px bg-border" aria-hidden />
                    <span className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">주력</span>
                        <Badge variant="outline" className={cn('text-xs', getMatchTypeBadgeClass(topMatchType))}>
                            {MATCH_TYPE_LABELS[topMatchType]}
                        </Badge>
                    </span>
                </>
            )}
        </div>
    )
}

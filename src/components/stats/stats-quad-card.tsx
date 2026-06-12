import type { MatchType } from '@/types'
import type { PlayerStats } from '@/lib/stats'
import { getMatchTypeStyle } from '@/lib/dashboard/match-type-style'
import { CARD_BASE, PILL_BASE } from '@/lib/dashboard/tokens'

type Props = {
    matchType?: MatchType
    stats: PlayerStats
    // 'neutral'은 경기 종류가 아닌 '전체' 종합 카드용 중립 스타일
    variant?: 'match' | 'neutral'
    masked?: boolean
    showSets?: boolean
}

export function StatsQuadCard({ matchType, stats, variant = 'match', masked, showSets = true }: Props) {
    // 중립('전체') 카드는 MatchType 색상 테이블 대신 회색 토큰을 사용
    const style =
        variant === 'neutral' || !matchType
            ? { label: '전체', textClass: 'text-foreground/80', borderClass: 'border-border', bgClass: 'bg-muted/40' }
            : getMatchTypeStyle(matchType)

    const winRateLabel =
        masked
            ? '*'
            : stats.wins + stats.losses === 0
                ? '-'
                : `${stats.winRate}%`

    // 승률 옆 '승률' 라벨 노출 조건 (마스킹이거나 실제 수치가 있을 때)
    const showRateSuffix = masked || winRateLabel !== '-'

    return (
        <div className={`${CARD_BASE} p-4 flex flex-col h-full`}>
            {/* 헤더: 카테고리 pill(좌) — 승률(우, 강조) */}
            <div className="flex items-center justify-between gap-2">
                <span className={`${PILL_BASE} ${style.textClass} ${style.borderClass} ${style.bgClass}`}>
                    {style.label}
                </span>
                <span className="text-3xl font-bold text-foreground leading-none">
                    {showRateSuffix && <span className="text-base font-normal text-foreground/75 mr-0.5">승률</span>}
                    {winRateLabel}
                </span>
            </div>

            {/* 승·패·무 — 들어간 내부 블록 3칸 */}
            <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="rounded-lg bg-background/50 py-2.5 text-center">
                    <p className="text-2xl font-bold text-foreground">{masked ? '*' : stats.wins}</p>
                    <p className="text-xs text-foreground/70 mt-0.5">승</p>
                </div>
                <div className="rounded-lg bg-background/50 py-2.5 text-center">
                    <p className="text-2xl font-bold text-foreground">{masked ? '*' : stats.losses}</p>
                    <p className="text-xs text-foreground/70 mt-0.5">패</p>
                </div>
                <div className="rounded-lg bg-background/50 py-2.5 text-center">
                    <p className="text-2xl font-bold text-foreground">{masked ? '*' : stats.draws}</p>
                    <p className="text-xs text-foreground/70 mt-0.5">무</p>
                </div>
            </div>

            {/* 푸터(세트 옵션 + 총경기). mt-auto로 카드 하단 고정 */}
            <div className="pt-2 mt-auto">
                {!masked && showSets && (stats.setsWon > 0 || stats.setsLost > 0) && (
                    <p className="text-xs text-foreground/70 text-right">
                        세트 {stats.setsWon} : {stats.setsLost}
                    </p>
                )}
                <p className="text-xs text-foreground/70 text-right">
                    {masked ? '* 경기' : `총 ${stats.totalMatches}경기`}
                </p>
            </div>
        </div>
    )
}

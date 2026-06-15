import {
    type BundleWithMatches, type BundleWithGameMeta, type BundleWithPersonal,
    calcWinRate,
} from '@/lib/analytics/shared'
import { aggregateHeadToHeadUnified } from '@/lib/analytics/head-to-head'
import type { UnifiedHeadToHead } from '@/lib/queries/stats'

// ── 라이벌 분석 (맞대결 빈도순 상대 + 최근 결과) ─────────────────────────

export type RivalEntry = {
    key: string
    opponentUserId: string | null
    opponentName: string | null
    total: number
    wins: number
    losses: number
    draws: number
    winRate: number
    last5: ('W' | 'L' | 'D')[]
    lastOutcome: 'W' | 'L' | 'D' | null
    lastDate: string | null
    lastScore: string | null
}

/**
 * minGames(기본 3) 이상 맞붙고 승률이 45~55% 박빙인 상대만 추려 라이벌 카드용
 * 데이터를 만든다. 50%에 가장 가까운(가장 박빙) 순으로 정렬한다.
 * 최근 결과/일자/스코어는 aggregateHeadToHeadUnified 상세에서 추출한다.
 */
export function selectRivals(
    bundle: BundleWithMatches & BundleWithGameMeta & BundleWithPersonal,
    userId: string,
    h2hList: UnifiedHeadToHead[],
    minGames = 3,
    limit = 6,
): RivalEntry[] {
    const top = h2hList
        .filter((o) => o.matches >= minGames)
        .map((o) => ({ ...o, winRate: calcWinRate(o.wins, o.losses) }))
        .filter((o) => o.winRate >= 45 && o.winRate <= 55)
        .sort((a, b) => Math.abs(50 - a.winRate) - Math.abs(50 - b.winRate) || b.matches - a.matches)
        .slice(0, limit)

    return top.map((o) => {
        const detail = aggregateHeadToHeadUnified(bundle, userId, {
            userId: o.opponentUserId,
            name: o.opponentName,
        })
        const recent = detail.matches[0] ?? null
        return {
            key: o.opponentUserId ?? `name:${o.opponentName}`,
            opponentUserId: o.opponentUserId,
            opponentName: o.opponentName,
            total: o.matches,
            wins: o.wins,
            losses: o.losses,
            draws: o.draws,
            winRate: o.winRate,
            last5: detail.last5,
            lastOutcome: recent ? recent.outcome : null,
            lastDate: recent ? recent.date : null,
            lastScore: recent ? recent.score : null,
        }
    })
}

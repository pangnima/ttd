import type { PersonalMatch } from '@/types'
import { calcWinRate } from '@/lib/analytics/shared'
import { monthKey } from '@/lib/analytics/date-utils'
import { buildMatchGroups, type MatchGroup } from '@/lib/personal-matches/match-groups'

// ── 개인 경기 월별 그룹핑 (월별 카드 헤더용) ─────────────────────────────

export type MonthGroup = {
    ym: string           // 'YYYY-MM'
    label: string        // '2026년 6월'
    wins: number
    losses: number
    draws: number
    winRate: number      // decisive 기준, 0경기 0
    groups: MatchGroup[] // 표시 그룹(로테이션 묶음/레코드), 최신순
}

/**
 * 개인 경기를 월별로 묶고(월 내림차순) 월별 승패·승률을 집계한다.
 * 세트 1개 = 게임 1개로 집계하며, 결과 미확정(winner NULL) 행은 제외한다(통계 경로 explode와 동일 규칙).
 */
export function groupByMonth(matches: PersonalMatch[]): MonthGroup[] {
    const buckets = new Map<string, PersonalMatch[]>()
    for (const m of matches) {
        const key = monthKey(m.playedAt)
        const arr = buckets.get(key) ?? []
        arr.push(m)
        buckets.set(key, arr)
    }

    return [...buckets.keys()]
        .sort((a, b) => b.localeCompare(a)) // 월 내림차순(최신 먼저)
        .map((ym) => {
            const groups = buildMatchGroups(buckets.get(ym)!)
            let wins = 0; let losses = 0; let draws = 0
            for (const g of groups) {
                wins += g.wins
                losses += g.losses
                draws += g.draws
            }
            const [y, mo] = ym.split('-')
            return {
                ym,
                label: `${Number(y)}년 ${Number(mo)}월`,
                wins, losses, draws,
                winRate: calcWinRate(wins, losses),
                groups,
            }
        })
}

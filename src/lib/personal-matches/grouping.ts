import type { PersonalMatch } from '@/types'
import { calcWinRate } from '@/lib/analytics/shared'
import { monthKey } from '@/lib/analytics/date-utils'

// ── 개인 경기 월별 그룹핑 (월별 카드 헤더용) ─────────────────────────────

export type MonthGroup = {
    ym: string           // 'YYYY-MM'
    label: string        // '2026년 6월'
    wins: number
    losses: number
    draws: number
    winRate: number      // decisive 기준, 0경기 0
    matches: PersonalMatch[]   // playedAt 내림차순
}

/** 개인 경기를 월별로 묶고(월 내림차순) 월별 승패·승률을 집계한다. */
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
            const list = [...buckets.get(ym)!].sort((a, b) => b.playedAt.localeCompare(a.playedAt))
            let wins = 0; let losses = 0; let draws = 0
            for (const m of list) {
                if (m.winner === 'me') wins++
                else if (m.winner === 'opponent') losses++
                else draws++
            }
            const [y, mo] = ym.split('-')
            return {
                ym,
                label: `${Number(y)}년 ${Number(mo)}월`,
                wins, losses, draws,
                winRate: calcWinRate(wins, losses),
                matches: list,
            }
        })
}

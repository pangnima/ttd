import type { MatchType } from '@/types'
import {
    type WinLoss, type BundleWithMatches, type BundleWithPersonal,
    calcWinRate, emptyWL, getMatchOutcome, addOutcome,
} from '@/lib/analytics/shared'

export type { WinLoss }

export type MatchTypeSummary = Record<MatchType, WinLoss>

export function aggregateByMatchType(
    bundle: BundleWithMatches & BundleWithPersonal,
    userId: string,
): MatchTypeSummary {
    const result: MatchTypeSummary = {
        singles: emptyWL(),
        men_doubles: emptyWL(),
        women_doubles: emptyWL(),
        mixed_doubles: emptyWL(),
    }

    for (const m of bundle.matches) {
        if (!m.result) continue
        const wl = result[m.matchType]
        addOutcome(wl, getMatchOutcome(m, userId))
    }

    for (const pm of bundle.personalMatches) {
        const wl = result[pm.matchType]
        const o = pm.winner === 'me' ? 'win' : pm.winner === 'opponent' ? 'loss' : 'draw'
        addOutcome(wl, o)
    }

    for (const key of Object.keys(result) as MatchType[]) {
        const wl = result[key]
        wl.winRate = calcWinRate(wl.wins, wl.losses)
    }

    return result
}

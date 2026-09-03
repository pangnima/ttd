import type { MatchType } from '@/types'
import type { PlayerStats } from '@/lib/stats'
import {
    type WinLoss, type BundleWithMatches, type BundleWithPersonal,
    calcWinRate, emptyWL, getMatchOutcome, addOutcome,
} from '@/lib/analytics/shared'

export type { WinLoss }

export type MatchTypeSummary = Record<MatchType, WinLoss>

/** 종목 4분기 PlayerStats — AnalyticsBundle.stats와 동일 형태 (순수 모듈에 두어 픽스처/테스트에서도 재사용). */
export type QuadStats = {
    singles: PlayerStats
    menDoubles: PlayerStats
    womenDoubles: PlayerStats
    mixedDoubles: PlayerStats
}

/** WinLoss → PlayerStats. 본인 분석은 세트를 숨기므로(showSets={false}) setsWon/setsLost는 0. */
export function toPlayerStats(wl: WinLoss): PlayerStats {
    return {
        wins: wl.wins,
        losses: wl.losses,
        draws: wl.draws,
        totalMatches: wl.total,
        winRate: wl.winRate,
        setsWon: 0,
        setsLost: 0,
        byMatchType: [],
    }
}

/** MatchTypeSummary → 종목 4분기 PlayerStats. */
export function toQuadStats(summary: MatchTypeSummary): QuadStats {
    return {
        singles: toPlayerStats(summary.singles),
        menDoubles: toPlayerStats(summary.men_doubles),
        womenDoubles: toPlayerStats(summary.women_doubles),
        mixedDoubles: toPlayerStats(summary.mixed_doubles),
    }
}

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

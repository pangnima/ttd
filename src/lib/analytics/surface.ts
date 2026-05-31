import type { CourtSurface } from '@/types'
import {
    type WinLoss, type BundleWithMatches, type BundleWithSurface, type BundleWithPersonal,
    calcWinRate, emptyWL, getMatchOutcome,
} from '@/lib/analytics/shared'

export type { WinLoss }

export type SurfaceStats = Record<'hard' | 'clay' | 'grass' | 'other' | 'unknown', WinLoss>

export function aggregateBySurface(
    bundle: BundleWithMatches & BundleWithSurface & BundleWithPersonal,
    userId: string,
): SurfaceStats {
    const result: SurfaceStats = {
        hard: emptyWL(),
        clay: emptyWL(),
        grass: emptyWL(),
        other: emptyWL(),
        unknown: emptyWL(),
    }

    for (const m of bundle.matches) {
        if (!m.result) continue
        const surface: CourtSurface | 'unknown' = bundle.courtSurfaceByMatchId[m.id] ?? 'unknown'
        const wl = result[surface]
        wl.total++
        const outcome = getMatchOutcome(m, userId)
        if (outcome === 'win') { wl.wins++; }
        else if (outcome === 'loss') { wl.losses++; }
        else { wl.draws++; }
    }

    for (const pm of bundle.personalMatches) {
        const surface: CourtSurface | 'unknown' = pm.surface ?? 'unknown'
        const wl = result[surface]
        wl.total++
        if (pm.winner === 'me') { wl.wins++; }
        else if (pm.winner === 'opponent') { wl.losses++; }
        else { wl.draws++; }
    }

    for (const key of Object.keys(result) as (CourtSurface | 'unknown')[]) {
        const wl = result[key]
        wl.winRate = calcWinRate(wl.wins, wl.losses)
    }

    return result
}

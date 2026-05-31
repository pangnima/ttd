import {
    type WinLoss, type BundleWithMatches, type BundleWithUserMap,
    calcWinRate, emptyWL, getMatchOutcome, getOpponentIds, addOutcome,
} from '@/lib/analytics/shared'

export type { WinLoss }

export type NtrpDiffStats = {
    stronger: WinLoss      // 상대 NTRP가 나보다 높음 (≥ +0.25)
    peer: WinLoss          // 비슷한 수준 (±0.25 이내)
    weaker: WinLoss        // 상대 NTRP가 나보다 낮음 (≤ -0.25)
    unknown: WinLoss       // NTRP 정보 없음
}

export function aggregateByNtrpDiff(
    bundle: BundleWithMatches & BundleWithUserMap,
    userId: string,
    userNtrp: number | null,
): NtrpDiffStats {
    const result: NtrpDiffStats = {
        stronger: emptyWL(),
        peer: emptyWL(),
        weaker: emptyWL(),
        unknown: emptyWL(),
    }

    if (!userNtrp) return result

    for (const m of bundle.matches) {
        if (!m.result) continue
        const opponentIds = getOpponentIds(m, userId)
        if (!opponentIds.length) continue

        const oppNtrps = opponentIds
            .map((id) => bundle.userMap.get(id)?.ntrp)
            .filter((n): n is number => typeof n === 'number' && n > 0)

        if (!oppNtrps.length) {
            addOutcome(result.unknown, getMatchOutcome(m, userId))
            continue
        }

        const avgOppNtrp = oppNtrps.reduce((s, n) => s + n, 0) / oppNtrps.length
        const diff = avgOppNtrp - userNtrp

        const bucket = diff >= 0.25 ? result.stronger : diff <= -0.25 ? result.weaker : result.peer
        addOutcome(bucket, getMatchOutcome(m, userId))
    }

    for (const key of ['stronger', 'peer', 'weaker', 'unknown'] as const) {
        const wl = result[key]
        wl.winRate = calcWinRate(wl.wins, wl.losses)
    }

    return result
}

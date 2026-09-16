import {
    type WinLoss, type BundleWithMatches, type BundleWithPersonal, type BundleWithUserMap,
    calcWinRate, emptyWL, getMatchOutcome, getOpponentIds, addOutcome,
} from '@/lib/analytics/shared'
import type { SettledPersonalMatch } from '@/lib/personal-matches/winner'

export type { WinLoss }

export type NtrpDiffStats = {
    stronger: WinLoss      // 상대 NTRP가 나보다 높음 (≥ +0.25)
    peer: WinLoss          // 비슷한 수준 (±0.25 이내)
    weaker: WinLoss        // 상대 NTRP가 나보다 낮음 (≤ -0.25)
    unknown: WinLoss       // NTRP 정보 없음
}

/**
 * 개인 경기 상대팀의 NTRP(F-23) — 입력 스냅샷(`ntrp_snapshot`) 우선, 없으면 회원 상대의 userMap 값.
 * `resolveOpponentRating`(personal-rating.ts)의 ①②와 같은 순서이고 ③④(본인·2.5 폴백)는 쓰지 않는다 —
 * 모르는 상대는 unknown 버킷으로 가야지 동급으로 세면 안 된다. 복식은 아는 값끼리 평균.
 */
function personalOpponentNtrp(pm: SettledPersonalMatch, userMap: BundleWithUserMap['userMap']): number | null {
    const pick = (snapshot: number | undefined, userId: string | undefined): number | null => {
        if (typeof snapshot === 'number' && snapshot > 0) return snapshot
        const fromMap = userId ? userMap.get(userId)?.ntrp : undefined
        return typeof fromMap === 'number' && fromMap > 0 ? fromMap : null
    }
    const known = [pick(pm.opponentNtrp, pm.opponentUserId), pick(pm.opponent2Ntrp, pm.opponent2UserId)]
        .filter((n): n is number => n !== null)
    if (known.length === 0) return null
    return known.reduce((s, n) => s + n, 0) / known.length
}

function bucketOf(result: NtrpDiffStats, oppNtrp: number, userNtrp: number): WinLoss {
    const diff = oppNtrp - userNtrp
    return diff >= 0.25 ? result.stronger : diff <= -0.25 ? result.weaker : result.peer
}

const PERSONAL_OUTCOME = { me: 'win', opponent: 'loss', draw: 'draw' } as const

export function aggregateByNtrpDiff(
    bundle: BundleWithMatches & BundleWithUserMap & Partial<BundleWithPersonal>,
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
        addOutcome(bucketOf(result, avgOppNtrp, userNtrp), getMatchOutcome(m, userId))
    }

    // 개인 경기(분해본) — 개인 탭은 클럽 매치가 없어 이 루프가 카드의 전부다(F-23)
    for (const pm of bundle.personalMatches ?? []) {
        if (!pm.winner) continue
        const oppNtrp = personalOpponentNtrp(pm, bundle.userMap)
        const bucket = oppNtrp === null ? result.unknown : bucketOf(result, oppNtrp, userNtrp)
        addOutcome(bucket, PERSONAL_OUTCOME[pm.winner])
    }

    for (const key of ['stronger', 'peer', 'weaker', 'unknown'] as const) {
        const wl = result[key]
        wl.winRate = calcWinRate(wl.wins, wl.losses)
    }

    return result
}

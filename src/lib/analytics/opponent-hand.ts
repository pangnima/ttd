import type { BundleWithPersonal } from '@/lib/analytics/shared'
import { type WinLoss, calcWinRate, emptyWL } from '@/lib/analytics/shared'

export type { WinLoss }

export type OpponentHandStats = Record<'right' | 'left', WinLoss>

// 손잡이 정보를 담은 userMap (회원 상대 보강용)
type HandUserMap = { userMap: Map<string, { dominantHand?: 'right' | 'left' }> }

/**
 * 개인 경기를 상대 손잡이(오른손/왼손)별로 집계.
 * - 외부(직접 입력) 상대: personal_matches.opponentDominantHand 사용
 * - 회원 상대: userMap의 프로필 손잡이로 보강
 * - 손잡이 미상 경기는 집계에서 제외
 */
export function aggregateByOpponentHand(
    bundle: BundleWithPersonal & HandUserMap,
): OpponentHandStats {
    const result: OpponentHandStats = {
        right: emptyWL(),
        left: emptyWL(),
    }

    for (const pm of bundle.personalMatches) {
        const hand =
            pm.opponentDominantHand ??
            (pm.opponentUserId ? bundle.userMap.get(pm.opponentUserId)?.dominantHand : undefined)
        if (hand !== 'right' && hand !== 'left') continue

        const wl = result[hand]
        wl.total++
        if (pm.winner === 'me') wl.wins++
        else if (pm.winner === 'opponent') wl.losses++
        else wl.draws++
    }

    result.right.winRate = calcWinRate(result.right.wins, result.right.losses)
    result.left.winRate = calcWinRate(result.left.wins, result.left.losses)

    return result
}

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
 * - 복식이면 상대 #1·#2 손잡이를 각각 집계 (경기 결과는 두 상대 모두에 동일 반영)
 * - 손잡이 미상 상대는 집계에서 제외
 */
export function aggregateByOpponentHand(
    bundle: BundleWithPersonal & HandUserMap,
): OpponentHandStats {
    const result: OpponentHandStats = {
        right: emptyWL(),
        left: emptyWL(),
    }

    const resolveHand = (
        directHand?: 'right' | 'left',
        userId?: string,
    ): 'right' | 'left' | undefined => {
        const hand = directHand ?? (userId ? bundle.userMap.get(userId)?.dominantHand : undefined)
        return hand === 'right' || hand === 'left' ? hand : undefined
    }

    const tally = (hand: 'right' | 'left', winner: 'me' | 'opponent' | 'draw') => {
        const wl = result[hand]
        wl.total++
        if (winner === 'me') wl.wins++
        else if (winner === 'opponent') wl.losses++
        else wl.draws++
    }

    for (const pm of bundle.personalMatches) {
        const hand1 = resolveHand(pm.opponentDominantHand, pm.opponentUserId)
        if (hand1) tally(hand1, pm.winner)

        const hand2 = resolveHand(pm.opponent2DominantHand, pm.opponent2UserId)
        if (hand2) tally(hand2, pm.winner)
    }

    result.right.winRate = calcWinRate(result.right.wins, result.right.losses)
    result.left.winRate = calcWinRate(result.left.wins, result.left.losses)

    return result
}

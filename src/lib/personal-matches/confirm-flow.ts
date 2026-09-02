import type { OpponentCandidate } from '@/lib/queries/users'

/**
 * 상호 확인 요청의 대표 확인자 결정 (순수 함수).
 * 단식은 상대 1명, 페어 고정 복식은 상대팀 두 명 중 플랫폼 회원(비게스트) 한 명이 대표로 확인한다.
 * 상대1 → 상대2 순으로 찾고, 대표가 opponent 슬롯(match_requests.opponent_user_id)이 되도록 슬롯을 스왑한다.
 * 클럽 후보 목록에 없는 userId는 전체 회원 검색(비게스트만 노출)에서 고른 회원이다.
 */

type RepCandidate = { userId?: string }

export type ConfirmRep<T extends RepCandidate> = {
    opponent: T      // 대표 확인자 (회원)
    opponent2: T     // 상대팀 나머지 (회원/비회원 무관)
    repUserId: string
    swapped: boolean // 상대2가 대표라 슬롯을 바꿨는지 (안내 문구용)
}

export function isPlatformMember(p: RepCandidate, candidates: OpponentCandidate[]): boolean {
    if (!p.userId) return false
    const known = candidates.find((c) => c.id === p.userId)
    return known ? !known.isGuest : true
}

export function resolveConfirmRep<T extends RepCandidate>(
    opponent: T,
    opponent2: T,
    candidates: OpponentCandidate[],
    isDoubles: boolean,
): ConfirmRep<T> | null {
    if (isPlatformMember(opponent, candidates) && opponent.userId) {
        return { opponent, opponent2, repUserId: opponent.userId, swapped: false }
    }
    if (isDoubles && isPlatformMember(opponent2, candidates) && opponent2.userId) {
        return { opponent: opponent2, opponent2: opponent, repUserId: opponent2.userId, swapped: true }
    }
    return null
}

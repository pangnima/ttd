import type { OpponentCandidate } from '@/lib/queries/users'

/**
 * 상호 확인 요청의 대표 확인자 결정 (순수 함수).
 * 단식은 상대 1명, 페어 고정 복식은 상대팀 두 명 중 플랫폼 회원(비게스트) 한 명이 대표(opponent 슬롯)가 된다.
 * 대표는 요청의 상대 슬롯 결정 규칙일 뿐이고, 결과 확인은 0060부터 회원 좌석 전원의 만장일치다.
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

/**
 * 지금 저장하면 실제로 무슨 일이 일어나는가 (순수 함수).
 *
 * 폼은 조건에 따라 다섯 갈래로 조용히 갈린다. 특히 상대팀이 **전원 비회원**이거나 슬롯이 비어 있으면
 * 확인 요청 없이 내 기록에만 저장되는데, 종전에는 그 부정 신호가 화면에 하나도 없었다
 * (`ConfirmFlowNotice`는 대표가 있을 때만 뜬다). 안내 배너 문구의 단일 출처.
 */
export type SaveOutcome =
    | 'confirmRequest'  // 상대 대표에게 확인 요청
    | 'roomGame'        // 방 게임 — 입장이 곧 동의라 수락 단계 없이 참가자 기록에 남는다
    | 'rotationPlan'    // 로테이션 일정 — 풀 회원에게 참여 요청(0057)
    | 'recruiting'      // 모집 중 — 참가자를 나중에 채운다
    | 'freeRecord'      // 자유 기록 — 내 기록에만 남는다

export function resolveSaveOutcome(args: {
    isRotation: boolean
    hasRep: boolean
    roomId?: string
    /** 모집형 — 참가자를 비운 채 저장할 수 있는 상태(리스트 노출 신규 또는 결과 없는 노출 기록) */
    allowEmptyPlayers: boolean
    /** 라인업이 모두 채워졌는가 */
    allFilled: boolean
}): SaveOutcome {
    if (args.isRotation) return 'rotationPlan'
    if (args.hasRep) return args.roomId ? 'roomGame' : 'confirmRequest'
    if (args.allowEmptyPlayers && !args.allFilled) return 'recruiting'
    return 'freeRecord'
}

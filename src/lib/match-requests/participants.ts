import type { MatchRequest, RequestAcceptance, RequestSeatRole } from '@/types'

/**
 * 확인 요청의 좌석·참여 수락 규칙 (순수 모듈 — DB 접근 없음).
 *
 * 0056부터 **방 밖 요청은 회원 좌석 전원이 참여를 수락해야** 기록이 생긴다.
 * 매칭 룸 안에서 만들어진 요청은 '비밀번호 입장 = 참여 동의'라 종전대로 대표 1명 모델을 쓴다 —
 * 그 경계가 `requiresAllMembers` 하나이고, 큐 분류·카드 문구가 모두 이 술어를 본다.
 *
 * 결과(스코어) 확정 권한은 여기서 다루지 않는다. 그쪽은 0059부터 경기의 회원 참가자 전원이며,
 * 확인은 제안자와 다른 팀만 한다(lib/personal-matches/confirmation.ts).
 */

/** 좌석이 앉은 팀. 스코어 반전 부호의 단일 출처 — 요청 세트는 언제나 요청자 관점으로 저장된다. */
export function viewerSideOf(role?: RequestSeatRole): 'requester' | 'opponent' {
    return role === 'opponent' || role === 'opponent2' ? 'opponent' : 'requester'
}

/** 전원 수락 모델이 적용되는가 — 방 밖 요청만. 룸 요청은 입장이 동의를 대신한다. */
export function requiresAllMembers(r: Pick<MatchRequest, 'roomId'>): boolean {
    return !r.roomId
}

/**
 * 진행도 3종이 보는 것은 좌석의 `userId`·`acceptance`뿐이다. 로테이션 세션 좌석(0057)도
 * 같은 두 필드를 가지므로 최소형으로 받아 문구·계산을 한 벌만 유지한다.
 */
export type AcceptanceSeat = { userId?: string; acceptance: RequestAcceptance | 'removed' }

/**
 * 수락 진행도 — 회원 좌석만 분모에 넣는다(비회원은 수락 대상이 아니다).
 * 거절·제외된 좌석도 뺀다(0059): 그들은 이미 명단에서 빠졌으므로 더 기다릴 응답이 없는데,
 * 분모에 남겨 두면 '2/3명 수락'처럼 영원히 안 채워지는 진행도가 된다.
 */
export function acceptanceProgress(seats: AcceptanceSeat[]): { accepted: number; total: number } {
    const members = seats.filter((s) => !!s.userId && (s.acceptance === 'pending' || s.acceptance === 'accepted'))
    return { accepted: members.filter((s) => s.acceptance === 'accepted').length, total: members.length }
}

/** '2/3명 수락'. 회원이 없으면 빈 문자열(표시하지 않는다). */
export function formatAcceptanceProgress(seats: AcceptanceSeat[]): string {
    const { accepted, total } = acceptanceProgress(seats)
    return total === 0 ? '' : `${accepted}/${total}명 수락`
}

/** 아직 응답하지 않은 회원 좌석 수 */
export function pendingMemberCount(seats: AcceptanceSeat[]): number {
    const { accepted, total } = acceptanceProgress(seats)
    return total - accepted
}

/**
 * 이름이 붙은 좌석 — 진행도 계산에는 이름이 필요 없지만(위 함수들) **명단 표시**에는 필요하다.
 * 요청 좌석(MatchRequestSeat)과 로테이션 세션 좌석(RotationSessionSeat)이 둘 다 이 형태를 만족한다.
 */
export type NamedAcceptanceSeat = AcceptanceSeat & { name: string }

/** 좌석 명단의 상태. 결과 축(seat-status.ts SeatState)의 참여 축 대응물이다. */
export type AcceptanceState = 'accepted' | 'pending' | 'guest' | 'rejected' | 'removed'

const ACCEPTANCE_LABEL: Record<AcceptanceState, string> = {
    accepted: '수락',
    pending: '응답 대기',
    guest: '자동 참여',
    rejected: '거절',
    removed: '제외됨',
}

export function acceptanceStateLabel(state: AcceptanceState): string {
    return ACCEPTANCE_LABEL[state]
}

/**
 * 좌석 → 상태별 이름 묶음. '2/3명 수락'이라는 숫자만으로는 **누구를 기다리는지** 알 수 없어
 * 재촉할 대상을 특정할 수 없었다 — 그 절단점을 잇는다.
 *
 * 비회원(userId 없음)은 수락 대상이 아니므로 'guest'다 — 규칙상 항상 동의한 것으로 본다.
 * 표시 순서는 수락 → 대기 → 게스트 → 거절 → 제외로, 결과 축의 groupSeatNames와 같은 결이다.
 */
export function groupAcceptanceNames(
    seats: NamedAcceptanceSeat[],
): Array<{ state: AcceptanceState; names: string[] }> {
    const stateOf = (s: NamedAcceptanceSeat): AcceptanceState => {
        if (!s.userId) return 'guest'
        return s.acceptance as AcceptanceState
    }
    const order: AcceptanceState[] = ['accepted', 'pending', 'guest', 'rejected', 'removed']
    return order
        .map((state) => ({
            state,
            names: seats.filter((s) => stateOf(s) === state).map((s) => s.name.trim()).filter(Boolean),
        }))
        .filter((g) => g.names.length > 0)
}

/**
 * 요청 목록을 '로테이션 세션 묶음'과 '단독 요청'으로 가른다(0056).
 * 세션은 게임마다 요청 1건을 만들지만 참여 동의의 단위는 세션이라 화면에서 한 장으로 묶는다.
 * 묶음 안 순서는 group_seq(입력 순)를 따른다.
 */
export function groupRotationRequests<T extends { request: MatchRequest }>(
    items: T[],
): { sessions: Array<{ sessionId: string; items: T[] }>; singles: T[] } {
    const bySession = new Map<string, T[]>()
    const singles: T[] = []
    for (const item of items) {
        const sid = item.request.rotationSessionId
        if (!sid) { singles.push(item); continue }
        const bucket = bySession.get(sid)
        if (bucket) bucket.push(item)
        else bySession.set(sid, [item])
    }
    const sessions = [...bySession.entries()].map(([sessionId, list]) => ({
        sessionId,
        items: [...list].sort((a, b) => (a.request.groupSeq ?? 0) - (b.request.groupSeq ?? 0)),
    }))
    return { sessions, singles }
}

export type PendingRequestLane =
    | 'respond'       // 내 차례 — 내가 수락/거절해야 한다
    | 'mine'          // 내가 보낸 요청 (취소 가능)
    | 'awaitMembers'  // 내 응답은 끝났고 남은 회원을 기다린다

/**
 * pending 요청 1건 → 허브 레인. 판정 순서가 규칙이다 — 위에서 걸리면 아래는 보지 않는다.
 *  1. 내 좌석이 없으면 관여할 수 없다(방어적)
 *  2. 룸 요청은 대표 1명 모델 — 대표만 응답하고 나머지는 기다린다
 *  3. 내 좌석이 미응답이면 내 차례
 *  4. 내가 요청자면 내가 보낸 요청
 *  5. 나머지는 다른 회원의 수락을 기다린다
 */
export function classifyPendingRequest(r: MatchRequest): PendingRequestLane {
    const role = r.viewerRole
    if (!role) return 'awaitMembers'

    if (!requiresAllMembers(r)) {
        if (role === 'opponent') return 'respond'
        return role === 'requester' ? 'mine' : 'awaitMembers'
    }

    const seat = r.seats.find((s) => s.role === role)
    if (seat?.acceptance === 'pending') return 'respond'
    if (role === 'requester') return 'mine'
    return 'awaitMembers'
}

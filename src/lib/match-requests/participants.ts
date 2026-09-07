import type { MatchRequest, MatchRequestSeat, RequestSeatRole } from '@/types'

/**
 * 확인 요청의 좌석·참여 수락 규칙 (순수 모듈 — DB 접근 없음).
 *
 * 0056부터 **방 밖 요청은 회원 좌석 전원이 참여를 수락해야** 기록이 생긴다.
 * 매칭 룸 안에서 만들어진 요청은 '비밀번호 입장 = 참여 동의'라 종전대로 대표 1명 모델을 쓴다 —
 * 그 경계가 `requiresAllMembers` 하나이고, 큐 분류·카드 문구가 모두 이 술어를 본다.
 *
 * 결과(스코어) 확정 권한은 여기서 다루지 않는다. 그쪽은 끝까지 요청 당사자 2명(요청자·대표)뿐이다.
 */

/** 좌석이 앉은 팀. 스코어 반전 부호의 단일 출처 — 요청 세트는 언제나 요청자 관점으로 저장된다. */
export function viewerSideOf(role?: RequestSeatRole): 'requester' | 'opponent' {
    return role === 'opponent' || role === 'opponent2' ? 'opponent' : 'requester'
}

/** 전원 수락 모델이 적용되는가 — 방 밖 요청만. 룸 요청은 입장이 동의를 대신한다. */
export function requiresAllMembers(r: Pick<MatchRequest, 'roomId'>): boolean {
    return !r.roomId
}

/** 수락 진행도 — 회원 좌석만 분모에 넣는다(비회원은 수락 대상이 아니다). */
export function acceptanceProgress(seats: MatchRequestSeat[]): { accepted: number; total: number } {
    const members = seats.filter((s) => !!s.userId)
    return { accepted: members.filter((s) => s.acceptance === 'accepted').length, total: members.length }
}

/** '2/3명 수락'. 회원이 없으면 빈 문자열(표시하지 않는다). */
export function formatAcceptanceProgress(seats: MatchRequestSeat[]): string {
    const { accepted, total } = acceptanceProgress(seats)
    return total === 0 ? '' : `${accepted}/${total}명 수락`
}

/** 아직 응답하지 않은 회원 좌석 수 */
export function pendingMemberCount(seats: MatchRequestSeat[]): number {
    const { accepted, total } = acceptanceProgress(seats)
    return total - accepted
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

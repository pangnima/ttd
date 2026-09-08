import type { MatchRequest, PersonalMatch, RequestSeatRole } from '@/types'

/**
 * 취소한 확인 요청 → 등록 폼 초안 (Week 38, 페어 고정 복식·단식의 무응답 탈출구).
 *
 * 로테이션은 명단에서 빼고 게스트로 넣는 경로(0064)가 있지만 페어 고정 복식·단식의 pending 요청은
 * 취소밖에 없었다. 요청은 불변이므로(참가자를 바꾸면 다른 요청이다) **취소한 뒤 같은 내용으로 다시 등록**하되,
 * 응답하지 않았거나 거절한 좌석은 회원 연결(userId)을 떼어 **게스트**로 바꾼다 — 로테이션 `guestOf`와 같은 규칙이다.
 * 게스트는 동의 절차가 없으므로(0056) 새 요청은 남은 회원 좌석만 기다리고, 상대팀에 회원이 없으면 자유 기록이 된다.
 *
 * 요청 행에는 대표(상대)의 프로필이 없어 이름만 `counterpartName`으로 받고 손잡이·NTRP는 비운다 —
 * 게스트로 바뀐 대표는 폼이 NTRP를 요구하므로 사용자가 채운다. 회원으로 남는 좌석은 폼이 프로필에서 자동 채운다.
 */
export function prefillFromRequest(request: MatchRequest, counterpartName: string): Partial<PersonalMatch> {
    const accepted = (role: RequestSeatRole) =>
        request.seats.find((s) => s.role === role)?.acceptance === 'accepted'
    const keep = (role: RequestSeatRole, userId?: string) => (userId && accepted(role) ? userId : undefined)

    return {
        playedAt: request.playedAt,
        playedTime: request.playedTime,
        matchType: request.matchType,
        surface: request.surface,
        courtName: request.courtName,
        notes: request.notes,
        setScores: [],
        opponentName: counterpartName,
        opponentUserId: keep('opponent', request.opponentUserId),
        partnerName: request.partnerName,
        partnerUserId: keep('partner', request.partnerUserId),
        partnerDominantHand: request.partnerDominantHand,
        partnerNtrp: request.partnerNtrp,
        opponent2Name: request.opponent2Name,
        opponent2UserId: keep('opponent2', request.opponent2UserId),
        opponent2DominantHand: request.opponent2DominantHand,
        opponent2Ntrp: request.opponent2Ntrp,
    }
}

/**
 * [게스트로 바꿔 다시 요청]을 보여줄 요청인가 — 방 밖 pending 요청 중 요청자 아닌 회원 좌석이 하나라도 미수락일 때.
 * 로테이션 파생 요청은 세션 카드의 게스트 대체(0064)가 담당하고, 방 안 요청은 입장이 곧 동의라 pending이 없다.
 */
export function canReissueAsGuest(request: Pick<MatchRequest, 'status' | 'roomId' | 'rotationSessionId' | 'seats'>): boolean {
    if (request.status !== 'pending' || request.roomId || request.rotationSessionId) return false
    return request.seats.some((s) => s.role !== 'requester' && !!s.userId && s.acceptance !== 'accepted')
}

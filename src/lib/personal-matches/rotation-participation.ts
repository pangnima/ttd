import type { RotationPoolPlayer, RotationSession, RotationSessionSeat } from '@/types'

/**
 * 로테이션 **세션(일정)** 의 참여 동의 규칙 (순수 모듈 — DB 접근 없음, 0057).
 *
 * `lib/match-requests/participants.ts`가 **요청(기록 1건)** 의 좌석 규칙이라면 이쪽은 그 형제다.
 * 경계는 시점이다 — 세션은 경기 전(일정), 요청은 경기 후(기록).
 *
 * 0057 이전에는 로테이션 등록이 rotation_sessions 1행만 만들고 풀 회원에게는 아무것도 가지 않았다.
 * 그래서 같은 시간에 함께 치는 사람들이 서로 모른 채 같은 일정을 중복 생성했다.
 */

/** 좌석 동의 모델이 적용되는가 — 방 밖 세션만. 방은 '비밀번호 입장 = 참여 동의'(0048)가 대신한다. */
export function requiresSessionConsent(s: Pick<RotationSession, 'roomId'>): boolean {
    return !s.roomId
}

/**
 * 결과(게임)를 입력할 자격 — DB `finalize_rotation_session` 진입 가드의 **단일 거울**이다(0057 §7a).
 * 이 판정이 없으면 좌석만 받고 아직 수락하지 않은 회원의 허브에
 * 누르면 `not_session_participant`를 뱉는 [결과 입력] 버튼이 뜬다.
 */
export function canEnterRotationResult(
    s: Pick<RotationSession, 'userId' | 'roomId' | 'viewerParticipation'>,
    viewerId: string,
    joinedRoomIds: ReadonlySet<string>,
): boolean {
    if (s.userId === viewerId) return true
    if (s.roomId) return joinedRoomIds.has(s.roomId)
    return s.viewerParticipation === 'accepted'
}

export type SessionLane =
    | 'respond'     // 내 차례 — 이 일정에 참여할지 수락/거절해야 한다
    | 'enter'       // 내 차례 — 결과(게임)를 입력할 수 있다
    | 'awaitOwner'  // 상대 대기 — 내 수락은 끝났고 주최자의 결과 입력을 기다린다
    | 'none'        // 큐에서 제외 (거절했거나 무관한 세션)

/**
 * 세션 1건 → 허브 레인. 판정 순서가 규칙이다 — 위에서 걸리면 아래는 보지 않는다.
 *  1. 입력 자격이 있으면 'enter' (소유자·방 참가자·수락자)
 *  2. 내 좌석이 미응답이면 'respond'
 *  3. 내 좌석이 수락됐는데 1에 안 걸렸다면 주최자를 기다린다 — 현재는 도달하지 않지만
 *     입력 자격이 좁아질 때를 위한 자리다(수락 = 입력 자격이 동치가 아닐 수 있다)
 *  4. 거절했거나 좌석이 없으면 큐에서 뺀다
 */
export function classifyRotationSession(
    s: RotationSession,
    viewerId: string,
    joinedRoomIds: ReadonlySet<string>,
): SessionLane {
    if (canEnterRotationResult(s, viewerId, joinedRoomIds)) return 'enter'
    if (s.viewerParticipation === 'pending') return 'respond'
    if (s.viewerParticipation === 'accepted') return 'awaitOwner'
    return 'none'
}

/**
 * 참가자를 초대할 수 있는가 (0058) — **방 밖 세션의 소유자 ∨ 수락한 참가자**.
 * `canEnterRotationResult`와 집합이 겹치지만 두 지점에서 다르다:
 *  · 방 세션을 배제한다 — 방은 '비밀번호 공유 = 초대'(0048)이고, 풀에 임의로 넣으면
 *    입장한 적 없는 사람이 accepted 좌석을 갖는 동의 구멍이 생긴다.
 *  · 방 참가자(joined)를 자격으로 세지 않는다.
 * DB `add_rotation_session_player`의 자격 검사와 미러다.
 */
export function canManageRotationPool(
    s: Pick<RotationSession, 'userId' | 'roomId' | 'viewerParticipation'>,
    viewerId: string,
): boolean {
    if (s.roomId) return false
    return s.userId === viewerId || s.viewerParticipation === 'accepted'
}

/** 세션 명부(players)에 있는 회원 id — 로컬 빌더 행과 '서버에 저장된 참가자'를 가르는 기준 */
export function poolMemberIds(players: RotationPoolPlayer[]): Set<string> {
    return new Set(players.map((p) => p.userId).filter((id): id is string => !!id))
}

/** 아직 응답하지 않은 좌석 (주최자 카드의 '대기 중' 이름 줄) */
export function pendingSeats(seats: RotationSessionSeat[]): RotationSessionSeat[] {
    return seats.filter((s) => s.acceptance === 'pending')
}

/** 참여를 거절한 좌석 — 풀에서는 이미 빠졌지만 주최자에게는 사실을 남겨 둔다 */
export function rejectedSeats(seats: RotationSessionSeat[]): RotationSessionSeat[] {
    return seats.filter((s) => s.acceptance === 'rejected')
}

/**
 * 다시 초대할 수 있는 좌석 — 본인이 거절했거나(rejected) 주최자가 뺐거나(removed, 0059).
 * 둘 다 명부에서는 빠져 있어 풀 행이 없으므로, 이 목록이 **유일한 재초대 진입점**이다.
 * 좌석을 남기지 않으면 이름조차 알 수 없어져(명부에도 없다) 화면에서 영영 사라진다.
 */
export function reinvitableSeats(seats: RotationSessionSeat[]): RotationSessionSeat[] {
    return seats.filter((s) => s.acceptance === 'rejected' || s.acceptance === 'removed')
}

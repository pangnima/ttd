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

/** 세션 좌석까지 보는 최소형 — 게이트가 명부(pending 좌석)를 봐야 하기 때문 */
type SessionGate = Pick<RotationSession, 'userId' | 'roomId' | 'viewerParticipation' | 'seats'>

/**
 * 아직 응답하지 않은 회원이 남아 있는가 — 결과 입력을 막는 조건(0064).
 * 방 세션은 '비밀번호 입장 = 참여 동의'(0048)라 좌석이 accepted로 태어나므로 이 개념이 없다.
 */
export function hasUnansweredSeats(s: Pick<RotationSession, 'roomId' | 'seats'>): boolean {
    return requiresSessionConsent(s) && pendingSeats(s.seats).length > 0
}

/**
 * 결과(게임)를 입력할 자격 — DB `finalize_rotation_session` 진입 가드의 **단일 거울**이다(0057 §7a).
 * 이 판정이 없으면 좌석만 받고 아직 수락하지 않은 회원의 허브에
 * 누르면 `not_session_participant`를 뱉는 [결과 입력] 버튼이 뜬다.
 *
 * 0064부터 **초대받은 사람이 전원 응답해야** 입력할 수 있다. 그 전에는 주최자가 수락을 기다리지 않고
 * 먼저 넣을 수 있었고(0057), 그 스코어는 pending 요청 + 협상 제안값으로 선적립됐다가 전원 수락 시
 * 되살아났다. 그 장치를 철회한 이유는 사용자가 본 화면이다 — 미수락 상태로 입력하면 상대에게
 * 「일정 초대」와 「게임 참여 확인」이 잇따라 도착해 같은 경기를 두 번 승인하는 것처럼 보였다.
 * 대신 응답하지 않는 사람은 주최자가 명부에서 빼고 게스트로 기록한다(무응답 탈출구).
 *
 * ⚠ 소유자 예외가 pending 검사보다 **뒤**에 와야 한다 — 앞에 두면 정작 초대를 보낸 사람만
 * 규칙 밖에 놓여 종전 동작이 그대로 남는다.
 */
export function canEnterRotationResult(
    s: SessionGate,
    viewerId: string,
    joinedRoomIds: ReadonlySet<string>,
): boolean {
    if (hasUnansweredSeats(s)) return false
    if (s.userId === viewerId) return true
    if (s.roomId) return joinedRoomIds.has(s.roomId)
    return s.viewerParticipation === 'accepted'
}

export type SessionLane =
    | 'respond'     // 내 차례 — 이 일정에 참여할지 수락/거절해야 한다
    | 'enter'       // 내 차례 — 결과(게임)를 입력할 수 있다
    | 'awaitSeats'  // 상대 대기 — 내 응답은 끝났고 남은 회원의 수락을 기다린다 (0064)
    | 'awaitOwner'  // 상대 대기 — 전원 수락됐고 주최자의 결과 입력을 기다린다
    | 'none'        // 큐에서 제외 (거절했거나 무관한 세션)

/**
 * 세션 1건 → 허브 레인. 판정 순서가 규칙이다 — 위에서 걸리면 아래는 보지 않는다.
 *  1. 입력 자격이 있으면 'enter' (전원 응답 완료 + 소유자·방 참가자·수락자)
 *  2. 내 좌석이 미응답이면 'respond'
 *  3. ⚠ 미응답 좌석이 남았는데 내가 입력 자격자였을 사람이면 'awaitSeats'.
 *     **이 분기가 없으면 소유자가 어느 레인에도 안 걸려 자기 세션이 허브에서 통째로 사라진다** —
 *     소유자는 좌석 행이 없어(세션을 만든 것이 곧 동의) viewerParticipation이 undefined라
 *     아래 두 줄에 걸리지 않고 'none'으로 떨어진다.
 *  4. 내 좌석이 수락됐는데 1에 안 걸렸다면 주최자를 기다린다
 *  5. 거절했거나 좌석이 없으면 큐에서 뺀다
 */
export function classifyRotationSession(
    s: RotationSession,
    viewerId: string,
    joinedRoomIds: ReadonlySet<string>,
): SessionLane {
    if (canEnterRotationResult(s, viewerId, joinedRoomIds)) return 'enter'
    if (s.viewerParticipation === 'pending') return 'respond'
    if (hasUnansweredSeats(s) && (s.userId === viewerId || s.viewerParticipation === 'accepted')) {
        return 'awaitSeats'
    }
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

import type { MatchRoomGame, PersonalMatchConfirmation } from '@/types'
import type { MatchQueueBucket } from '@/lib/match-requests/queue'
import { isLineupCompleteByRoles } from '@/lib/personal-matches/lineup'
import { canRespondToProposal, hasDisputeHistory, isReentryTurn } from '@/lib/personal-matches/confirmation'
import { isRoomGameParty, canEditRoomGame } from '@/lib/match-rooms/game-status'

/**
 * 룸 안 「지금 할 일」 (순수 — Week 39).
 *
 * 허브가 여러 경기를 가로질러 '내 차례'를 모아 주던 일을, 룸에서는 **한 이벤트 안에서** 한다.
 * 분류 규칙은 새로 만들지 않는다 — `classifyPendingMatch`(queue.ts)의 판정 순서를 방 게임
 * (`MatchRoomGame` + 협상 행)에 그대로 옮긴 것이고, 자격 술어도 confirmation.ts 것을 그대로 쓴다.
 * 액션 버튼의 분기(RoomGameActions)와 어긋나면 "배너는 할 일이 있다는데 버튼이 없는" 화면이 된다.
 */
export type RoomGameTurn =
    | 'enterResult'     // 내가 결과를 입력할 차례
    | 'confirmResult'   // 제안된 결과를 확인할 차례
    | 'reenterResult'   // 이의를 받아 다시 입력할 차례
    | 'reentryReview'   // 이의 뒤 재제안된 결과를 확인할 차례
    | 'fillLineup'      // 모집 중 — 라인업을 채워야 결과를 넣을 수 있다
    | 'closeRotation'   // 호스트 — 게임이 전부 확정됐으니 [게임 입력 종료]로 마무리할 차례(0077)
    | 'waiting'         // 상대 차례
    | 'none'            // 나와 무관하거나 이미 끝난 게임

/** 내 차례인 것부터 — 배너는 가장 급한 하나만 말한다 */
const TURN_PRIORITY: RoomGameTurn[] = [
    'reenterResult', 'reentryReview', 'confirmResult', 'enterResult', 'fillLineup', 'closeRotation', 'waiting',
]

export const ROOM_TURN_LABEL: Record<Exclude<RoomGameTurn, 'none'>, string> = {
    reenterResult: '결과를 다시 입력해주세요',
    reentryReview: '다시 입력된 결과를 확인해주세요',
    confirmResult: '제안된 결과를 확인해주세요',
    enterResult: '경기 결과를 입력해주세요',
    fillLineup: '참가자를 채워주세요',
    closeRotation: '모든 결과가 확정됐습니다 — 게임 입력을 종료하면 매칭이 마무리됩니다',
    waiting: '상대의 응답을 기다리는 중입니다',
}

/** 내가 지금 움직여야 하는 차례인가 — 강조색과 뱃지의 단일 출처 */
export function isMyRoomTurn(turn: RoomGameTurn): boolean {
    return turn !== 'none' && turn !== 'waiting'
}

/**
 * 방 게임 1건 → 뷰어 관점의 차례.
 *
 * 판정 순서:
 *  1. 스코어가 있으면 끝난 게임 (정정은 별도 경로다 — 할 일이 아니다)
 *  2. 당사자가 아니면 아무 차례도 아니다
 *  3. 자유 기록은 협상 상대가 없어 라인업만 본다. 단 손댈 수 있는 사람은 작성자뿐이다
 *  4. 협상 행을 못 읽거나 좌석이 아니면 대기
 *  5. 이의 → 차례는 제안자뿐
 *  6. 이의를 거친 재제안 → 좌석 폴백보다 앞에 둔다(queue.ts와 같은 이유)
 *  7. 제안 → 아직 확인할 수 있는 좌석이면 내 차례
 *  8. none → 내가 제안할 차례
 */
export function classifyRoomGameTurn(
    game: MatchRoomGame,
    viewerId: string,
    c?: PersonalMatchConfirmation,
): RoomGameTurn {
    if (game.setScores.length > 0) return 'none'
    if (!isRoomGameParty(game, viewerId)) return 'none'

    if (game.sourceType !== 'confirmation') {
        if (!canEditRoomGame(game, viewerId)) return 'none'
        const lineupReady = isLineupCompleteByRoles(game.matchType, game.participants.map((p) => p.role))
        return lineupReady ? 'enterResult' : 'fillLineup'
    }

    if (!c || !game.sourceRequestId) return 'waiting'
    if (c.status === 'disputed') return isReentryTurn(c) ? 'reenterResult' : 'waiting'
    if (hasDisputeHistory(c) && c.status === 'proposed') {
        return canRespondToProposal(c) ? 'reentryReview' : 'waiting'
    }
    if (!c.viewerIsParty) return 'waiting'
    if (c.status === 'proposed') return canRespondToProposal(c) ? 'confirmResult' : 'waiting'
    if (c.status === 'none') return 'enterResult'
    return 'waiting'
}

export type RoomTurnSummary = { turn: Exclude<RoomGameTurn, 'none'>; count: number }

/** 여러 차례 중 가장 급한 하나 + 그 건수. 'none'은 세지 않는다 */
function pickTurn(turns: RoomGameTurn[]): RoomTurnSummary | null {
    for (const turn of TURN_PRIORITY) {
        const count = turns.filter((t) => t === turn).length
        if (count > 0) return { turn: turn as Exclude<RoomGameTurn, 'none'>, count }
    }
    return null
}

/**
 * 룸 전체에서 뷰어가 지금 할 일 하나 — 없으면 null(할 일도 기다릴 것도 없다).
 * 같은 차례가 여러 건이면 건수를 함께 돌려 "N건"을 말할 수 있게 한다.
 */
export function viewerRoomTurn(
    games: MatchRoomGame[],
    viewerId: string,
    confirmations: Record<string, PersonalMatchConfirmation>,
    opts: { hostOfPendingRotation?: boolean } = {},
): RoomTurnSummary | null {
    const turns = games.map((g) =>
        classifyRoomGameTurn(g, viewerId, g.sourceRequestId ? confirmations[g.sourceRequestId] : undefined))
    // 호스트의 마지막 할 일(0077) — 미확정 로테이션 방은 게임을 다 확정해도 세션이 남아 정산되지 않는다.
    // 그 사실을 아무도 말하지 않아 방이 영영 「진행 중」에 머물렀다(E2E S4.13). 게임이 있고 전부 끝났으면
    // 호스트에게 종료 차례를 준다. 미확정 게임이 하나라도 있으면 그쪽 차례가 우선한다(PRIORITY).
    if (opts.hostOfPendingRotation && allGamesSettled(games)) turns.push('closeRotation')
    return pickTurn(turns)
}

/** 게임이 하나 이상 있고 전부 스코어가 붙었는가 — 호스트 종료 차례의 조건 */
export function allGamesSettled(games: ReadonlyArray<Pick<MatchRoomGame, 'setScores'>>): boolean {
    return games.length > 0 && games.every((g) => g.setScores.length > 0)
}

/**
 * 목록용 — 호스트의 미확정 로테이션 세션 중 게임이 전부 확정된 방을 고른다(0077).
 * `gamesByRoom`은 대표 게임(관점 행 제외)의 총수·확정 수. 조회는 호출자(room-queue.ts)가 한다.
 */
export function closeRotationRooms(
    sessions: ReadonlyArray<{ roomId?: string; userId: string }>,
    viewerId: string,
    gamesByRoom: Readonly<Record<string, { total: number; settled: number }>>,
): string[] {
    const out: string[] = []
    for (const s of sessions) {
        if (!s.roomId || s.userId !== viewerId) continue
        const g = gamesByRoom[s.roomId]
        if (g && g.total > 0 && g.settled === g.total) out.push(s.roomId)
    }
    return out
}

// ── 매칭 리스트 롤업 ──
//
// 룸 상세는 방의 **대표 게임**(get_match_room_detail)을 보지만, 목록은 그 방들을 다 열어 볼 수 없다.
// 대신 이미 한 벌 조회해 둔 내 미확정 행(fetchMatchQueue의 B축)을 room_id로 접는다 —
// 버킷은 같은 규칙(classifyPendingMatch)에서 나왔으므로 어휘만 맞추면 된다.

const BUCKET_TO_TURN: Record<MatchQueueBucket, RoomGameTurn> = {
    confirmResult: 'confirmResult',
    enterResult: 'enterResult',
    fillLineup: 'fillLineup',
    reenterResult: 'reenterResult',
    reentryReview: 'reentryReview',
    awaitingCounterpart: 'waiting',
    awaitingReentry: 'waiting',
    awaitingReentryConfirm: 'waiting',
}

/** 허브 버킷 → 룸 차례. 대기 3종은 목록에서 구분할 이유가 없어 하나로 접는다 */
export function turnOfBucket(bucket: MatchQueueBucket): RoomGameTurn {
    return BUCKET_TO_TURN[bucket]
}

/** 룸 카드에 붙는 짧은 필 — 배너 문장(ROOM_TURN_LABEL)과 같은 판정, 다른 길이 */
export const ROOM_TURN_PILL: Record<Exclude<RoomGameTurn, 'none'>, string> = {
    reenterResult: '다시 입력',
    reentryReview: '결과 확인',
    confirmResult: '결과 확인',
    enterResult: '결과 입력',
    fillLineup: '참가자 채우기',
    closeRotation: '게임 입력 종료',
    waiting: '상대 대기',
}

/**
 * 사이드바·모바일 nav 뱃지 = **매칭 리스트에서 내 차례로 강조되는 카드 수**.
 *
 * 알림의 단일 출처이고, 정의가 곧 "그 화면에 실제로 그려지는 강조 카드 수"라 배지와 목록이 어긋날 수 없다.
 * 뺄셈으로 정의하지 않는다 — 항이 늘 때마다 뺄셈을 쓰는 곳이 함께 깨진 전력이 있다.
 * 방 밖 직접 기록의 결과 입력은 여기 없다: 확인해 줄 상대가 없어 알릴 일이 아니라 내 기록 관리다.
 */
export function roomBadgeTotal(turns: Map<string, RoomTurnSummary>, inviteCount: number): number {
    let mine = 0
    for (const summary of turns.values()) {
        if (isMyRoomTurn(summary.turn)) mine += 1
    }
    return mine + inviteCount
}

/** 미확정 행들을 방 단위로 접는다 — roomId가 없는 행(방 밖 기록)은 버린다 */
export function rollUpRoomTurns(
    rows: ReadonlyArray<{ roomId?: string; turn: RoomGameTurn }>,
): Map<string, RoomTurnSummary> {
    const byRoom = new Map<string, RoomGameTurn[]>()
    for (const row of rows) {
        if (!row.roomId) continue
        const list = byRoom.get(row.roomId)
        if (list) list.push(row.turn)
        else byRoom.set(row.roomId, [row.turn])
    }

    const result = new Map<string, RoomTurnSummary>()
    for (const [roomId, turns] of byRoom) {
        const summary = pickTurn(turns)
        if (summary) result.set(roomId, summary)
    }
    return result
}

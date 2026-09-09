import type { MatchRoomGame, PersonalMatchConfirmation } from '@/types'
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
    | 'waiting'         // 상대 차례
    | 'none'            // 나와 무관하거나 이미 끝난 게임

/** 내 차례인 것부터 — 배너는 가장 급한 하나만 말한다 */
const TURN_PRIORITY: RoomGameTurn[] = [
    'reenterResult', 'reentryReview', 'confirmResult', 'enterResult', 'fillLineup', 'waiting',
]

export const ROOM_TURN_LABEL: Record<Exclude<RoomGameTurn, 'none'>, string> = {
    reenterResult: '결과를 다시 입력해주세요',
    reentryReview: '다시 입력된 결과를 확인해주세요',
    confirmResult: '제안된 결과를 확인해주세요',
    enterResult: '경기 결과를 입력해주세요',
    fillLineup: '참가자를 채워주세요',
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

/**
 * 룸 전체에서 뷰어가 지금 할 일 하나 — 없으면 null(할 일도 기다릴 것도 없다).
 * 같은 차례가 여러 건이면 건수를 함께 돌려 "N건"을 말할 수 있게 한다.
 */
export function viewerRoomTurn(
    games: MatchRoomGame[],
    viewerId: string,
    confirmations: Record<string, PersonalMatchConfirmation>,
): RoomTurnSummary | null {
    const turns = games.map((g) =>
        classifyRoomGameTurn(g, viewerId, g.sourceRequestId ? confirmations[g.sourceRequestId] : undefined))

    for (const turn of TURN_PRIORITY) {
        const count = turns.filter((t) => t === turn).length
        if (count > 0) return { turn: turn as Exclude<RoomGameTurn, 'none'>, count }
    }
    return null
}

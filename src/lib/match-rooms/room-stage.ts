import type { MatchRoomGame, MatchRoomMeta, MatchRoomSource } from '@/types'

/**
 * 매칭 룸의 진행 단계 (순수 — Week 39).
 *
 * DB에는 `is_settled` boolean 하나뿐이라 사용자는 "지금 이 매칭이 어디쯤인지"를 볼 수 없었다.
 * 컬럼을 더하는 대신 이미 있는 재료(게임 목록·출처·정산 플래그)에서 4단계를 파생한다 —
 * 정산 판정의 권위는 여전히 `recompute_match_room_settled`(0049·0050)에 있고 이건 그 표시용 거울이다.
 */
export type RoomStage = 'recruiting' | 'playing' | 'reviewing' | 'closed'

export const ROOM_STAGE_LABEL: Record<RoomStage, string> = {
    recruiting: '모집 중',
    playing: '진행 중',
    reviewing: '결과 확인 중',
    closed: '종료',
}

export const ROOM_STAGE_HINT: Record<RoomStage, string> = {
    recruiting: '아직 등록된 게임이 없습니다. 참가자가 모이면 게임을 추가하세요.',
    playing: '결과를 기다리는 게임이 남아 있습니다.',
    reviewing: '모든 게임의 결과가 입력됐습니다. 참가자 확인이 끝나면 매칭이 종료됩니다.',
    closed: '모든 결과가 확정됐습니다. 전적은 개인 경기 결과에서 볼 수 있습니다.',
}

/** 결과가 오갔지만 아직 확정 전 — 제안·이의는 "입력은 끝났고 확인이 남았다"는 뜻이다 */
function isUnderReview(game: MatchRoomGame): boolean {
    return game.resultStatus === 'proposed' || game.resultStatus === 'disputed'
}

type StageInput = {
    room: Pick<MatchRoomMeta, 'isSettled'>
    games: MatchRoomGame[]
    source: MatchRoomSource
}

/**
 * 판정 순서가 규칙이다 — 위에서 걸리면 아래는 보지 않는다.
 *  1. 정산됐으면 종료 (DB가 이미 "대표 게임 전부 확정 + 대기 없음"을 검사했다)
 *  2. 미확정 로테이션 방은 **결코 '결과 확인 중'이 아니다** — 세션이 열려 있는 한 게임이 더 들어올 수 있다
 *  3. 게임이 하나도 없으면 모집 중
 *  4. 스코어가 빈 게임이 없는데도 정산되지 않았다면 확인·대기가 남은 것이다
 *  5. 스코어가 빈 게임이 전부 제안·이의 중이면 입력은 끝난 것이다
 */
export function roomStage({ room, games, source }: StageInput): RoomStage {
    if (room.isSettled) return 'closed'
    if (source.kind === 'rotation' && !source.isFinalized) {
        return games.length === 0 ? 'recruiting' : 'playing'
    }
    if (games.length === 0) return 'recruiting'

    const open = games.filter((g) => g.setScores.length === 0)
    if (open.length === 0) return 'reviewing'
    return open.every(isUnderReview) ? 'reviewing' : 'playing'
}

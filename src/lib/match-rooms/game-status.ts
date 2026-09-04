import type { MatchRoomDetail, MatchRoomGame } from '@/types'
import { isLineupCompleteByRoles } from '@/lib/personal-matches/lineup'

/**
 * 방 상세 게임 행의 상태 칩(0049) — 결과가 있으면 칩 없이 스코어만 보여준다.
 * 상호 확인 게임은 협상 상태를, 자유 기록은 라인업 완성 여부를 말한다.
 */
export function roomGameStatusLabel(game: MatchRoomGame): string | null {
    if (game.setScores.length > 0) return null
    if (game.sourceType === 'confirmation') {
        if (game.resultStatus === 'proposed') return '결과 확인 대기'
        if (game.resultStatus === 'disputed') return '이의 제기'
        return '결과 미입력'
    }
    const lineupReady = isLineupCompleteByRoles(game.matchType, game.participants.map((p) => p.role))
    return lineupReady ? '결과 미입력' : '모집 중'
}

/** 작성자만 수정 폼으로 갈 수 있다 — 상호 확인 게임은 잠겨 있어 아무도 못 간다(결과는 제안·확인으로) */
export function canEditRoomGame(game: MatchRoomGame, viewerId: string): boolean {
    return game.sourceType === 'direct' && game.ownerUserId === viewerId
}

/** 이 게임의 당사자(작성자 또는 라인업에 든 회원) — 개인 경기 목록에서 결과를 입력·확인할 수 있다 */
export function isRoomGameParty(game: MatchRoomGame, viewerId: string): boolean {
    return game.ownerUserId === viewerId || game.participants.some((p) => p.userId === viewerId)
}

/** 게임이 하나도 없을 때의 안내 — 출처별로 다음에 할 일이 다르다 */
export function roomGamesEmptyMessage(detail: MatchRoomDetail): string {
    const s = detail.source
    if (s.kind === 'rotation' && !s.isFinalized) {
        // 0050: 방에 참가한 사람 누구나 자기 기준으로 게임을 넣을 수 있다
        return '게임이 아직 없습니다. 개인 경기 기록의 "결과 입력 대기 로테이션" 카드에서 게임을 구성하세요.'
    }
    if (s.kind === 'confirmation' && s.requestStatus === 'pending') {
        return '상대 대표가 확인 요청을 수락하면 결과를 등록할 수 있습니다.'
    }
    return '게임이 없습니다. 함께 친 참가자로 게임을 추가하세요.'
}

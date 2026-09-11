import type { MatchRoomDetail, MatchRoomGame } from '@/types'
import { isLineupCompleteByRoles } from '@/lib/personal-matches/lineup'

/**
 * 상태 배지의 톤 — attention은 누군가 손을 대야 하는 상태(대기·주의 = spot),
 * pending은 아직 손댈 수 없는 상태(개인 경기 카드의 '모집 중'과 같은 자리).
 */
export type RoomGameStatus = { label: string; tone: 'attention' | 'pending' }

/**
 * 방 상세 게임 행의 상태 배지(0049) — 결과가 있으면 null이고 결과 배지(WIN/LOSS)가 그 자리를 쓴다.
 * 그래서 한 행에 배지가 둘 나오지 않는다. 상호 확인 게임은 협상 상태를, 자유 기록은 라인업 완성 여부를 말한다.
 */
export function roomGameStatusBadge(game: MatchRoomGame): RoomGameStatus | null {
    if (game.setScores.length > 0) return null
    if (game.sourceType === 'confirmation') {
        if (game.resultStatus === 'proposed') return { label: '결과 확인 대기', tone: 'attention' }
        if (game.resultStatus === 'disputed') return { label: '이의 제기', tone: 'attention' }
        return { label: '결과 미입력', tone: 'attention' }
    }
    const lineupReady = isLineupCompleteByRoles(game.matchType, game.participants.map((p) => p.role))
    // 모집 중은 참가자가 차기 전까지 아무도 결과를 넣을 수 없다 — 할 일이 아니므로 주의색을 쓰지 않는다
    return lineupReady ? { label: '결과 미입력', tone: 'attention' } : { label: '모집 중', tone: 'pending' }
}

/** 작성자만 수정 폼으로 갈 수 있다 — 상호 확인 게임은 잠겨 있어 아무도 못 간다(결과는 제안·확인으로) */
export function canEditRoomGame(game: MatchRoomGame, viewerId: string): boolean {
    return game.sourceType === 'direct' && game.ownerUserId === viewerId
}

/** 이 게임의 당사자(작성자 또는 라인업에 든 회원) — 개인 경기 목록에서 결과를 입력·확인할 수 있다 */
export function isRoomGameParty(game: MatchRoomGame, viewerId: string): boolean {
    return game.ownerUserId === viewerId || game.participants.some((p) => p.userId === viewerId)
}

/**
 * 이 방의 게임에 배정된 회원 id (0070) — 작성자와 라인업의 회원 전부.
 * DB 가드 kick_room_member의 `member_has_games`가 보는 집합과 같은 뜻이라,
 * 이것이 참인 회원에게는 [내보내기]를 아예 그리지 않는다("눌러도 거절당하는 버튼"을 없앤다).
 */
export function roomGameMemberIds(games: MatchRoomGame[]): Set<string> {
    const ids = new Set<string>()
    for (const g of games) {
        ids.add(g.ownerUserId)
        for (const p of g.participants) if (p.userId) ids.add(p.userId)
    }
    return ids
}

/**
 * [자동 대진표]를 그릴 수 있는가 — `create_room_lineup` 가드의 거울(0072).
 *
 * 방장 여부는 `candidateCount`가 대신 말한다(대진 후보는 방장에게만 조회된다).
 * 정산된 방을 빼는 이유는 RPC가 `room_already_closed`로 거절하기 때문이고, **거절할 것을 그리지
 * 않는 것**이 `roomGameMemberIds`가 [내보내기]에 쓰는 것과 같은 원칙이다.
 *
 * ⚠ 방식(단식/복식·로테이션 여부)은 보지 않는다. 복식 방은 전부 로테이션 방이고,
 * 자동 대진표는 바로 그 방을 위해 만들어졌다(0066 머리말·0072).
 */
export function canCreateRoomLineup(detail: MatchRoomDetail, candidateCount: number): boolean {
    return candidateCount > 0 && !detail.room.isSettled
}

/**
 * 게임이 하나도 없을 때의 안내 — 출처별로 다음에 할 일이 다르다.
 * 방장에게는 [자동 대진표]도 있다는 것을 말한다(Week 47) — 그 버튼은 방장에게만 보이므로
 * 참가자 문구에 섞으면 "없는 버튼을 가리키는" 안내가 된다.
 */
export function roomGamesEmptyMessage(detail: MatchRoomDetail, isHost = false): string {
    const s = detail.source
    if (s.kind === 'rotation' && !s.isFinalized) {
        // 0050: 방에 참가한 사람 누구나 이 화면의 '게임 입력'에서 자기 기준으로 게임을 넣는다
        const base = '게임이 아직 없습니다. 위 [게임 입력]에서 파트너·상대와 스코어를 구성하세요.'
        return isHost ? `${base} 경기 전이라면 [자동 대진표]로 미리 짤 수도 있습니다.` : base
    }
    if (s.kind === 'confirmation' && s.requestStatus === 'pending') {
        return '상대 대표가 확인 요청을 수락하면 결과를 등록할 수 있습니다.'
    }
    return '게임이 없습니다. 함께 친 참가자로 게임을 추가하세요.'
}

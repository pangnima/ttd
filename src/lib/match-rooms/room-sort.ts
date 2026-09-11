import type { RoomTurnSummary } from '@/lib/match-rooms/room-turn'
import { isMyRoomTurn } from '@/lib/match-rooms/room-turn'

/**
 * 내 차례가 있는 방을 위로 (Week 39).
 *
 * ⚠ 커서 페이지네이션과 충돌하지 않도록 **첫 페이지 한 장 안에서만** 쓴다 —
 * DB 정렬(played_at, played_time, id)이 커서의 기준이라 목록 전체를 재정렬하면
 * '다음 페이지'가 건너뛰거나 겹친다. 그래서 「참여 중인 매칭」의 첫 페이지에만 적용한다.
 *
 * 안정 정렬이다 — 내 차례 여부가 같으면 원래 날짜 순서를 유지한다.
 */
export function sortByMyTurnFirst<T extends { id: string }>(
    rooms: T[],
    turns: Map<string, RoomTurnSummary>,
): T[] {
    const mine = (room: T) => {
        const turn = turns.get(room.id)
        return turn && isMyRoomTurn(turn.turn) ? 1 : 0
    }
    return [...rooms].sort((a, b) => mine(b) - mine(a))
}

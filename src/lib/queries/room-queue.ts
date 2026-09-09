import 'server-only'

import { cache } from 'react'
import type { MatchRoomInvite } from '@/types'
import { fetchMatchQueue } from '@/lib/queries/match-queue'
import { rollUpRoomTurns, turnOfBucket, type RoomTurnSummary } from '@/lib/match-rooms/room-turn'

/**
 * 매칭 리스트의 작업 큐(Week 39).
 *
 * 허브가 가진 유일한 고유 가치는 "여러 경기를 가로질러 내 차례를 모으는 것"이었다.
 * 그 일을 목록이 승계한다 — 방을 하나씩 열어 보지 않고도 어느 매칭에서 내 차례인지 보이게.
 *
 * 새 쿼리를 열지 않는다: `fetchMatchQueue`는 React cache라 레이아웃·다른 화면과 같은 한 벌을 쓰고,
 * 여기서는 이미 분류가 끝난 미확정 행(B축)을 room_id로 접기만 한다.
 */
export type RoomQueue = {
    /** roomId → 그 방에서 내가 지금 할 일 (없는 방은 키 자체가 없다) */
    turns: Map<string, RoomTurnSummary>
    /** 아직 응답하지 않은 방 초대 — 목록 최상단 「나를 초대한 매칭」 */
    invites: MatchRoomInvite[]
}

export const EMPTY_ROOM_QUEUE: RoomQueue = { turns: new Map(), invites: [] }

export const fetchRoomQueue = cache(async (userId: string): Promise<RoomQueue> => {
    const queue = await fetchMatchQueue(userId)

    const turns = rollUpRoomTurns([
        ...queue.pendingMatches.map(({ match, bucket }) => ({
            roomId: match.roomId,
            turn: turnOfBucket(bucket),
        })),
        // 입력 가능한 로테이션 일정(0064) — 방 세션이면 그 방에서 결과를 넣을 차례다.
        // 방 밖 세션은 roomId가 없어 롤업에서 버려진다.
        ...queue.rotationSessions.map((s) => ({ roomId: s.roomId, turn: 'enterResult' as const })),
    ])

    return { turns, invites: queue.roomInvites }
})

import 'server-only'

import { cache } from 'react'
import type { MatchRoomInvite } from '@/types'
import { createClient } from '@/lib/supabase/server'
import { fetchMatchQueue } from '@/lib/queries/match-queue'
import { closeRotationRooms, rollUpRoomTurns, turnOfBucket, type RoomTurnSummary } from '@/lib/match-rooms/room-turn'

/**
 * 매칭 리스트의 작업 큐(Week 39).
 *
 * 허브가 가진 유일한 고유 가치는 "여러 경기를 가로질러 내 차례를 모으는 것"이었다.
 * 그 일을 목록이 승계한다 — 방을 하나씩 열어 보지 않고도 어느 매칭에서 내 차례인지 보이게.
 *
 * 새 쿼리를 열지 않는다: `fetchMatchQueue`는 React cache라 레이아웃·다른 화면과 같은 한 벌을 쓰고,
 * 여기서는 이미 분류가 끝난 미확정 행(B축)을 room_id로 접기만 한다.
 *
 * 방 세션(로테이션 방의 빈 풀)은 **차례로 세지 않는다**(0077). 방 안 [게임 입력]은 상시 가능한 액션이지
 * 누가 응답을 기다리는 일이 아니고, 세지면 게임을 다 확정한 뒤에도 풀 회원 전원에게 뱃지가 남았다(E2E S4.13).
 * 대신 호스트에게는 "게임이 전부 확정됐으니 종료하라"는 차례를 준다 — 그것이 방을 정산으로 옮기는 마지막 손이다.
 */
export type RoomQueue = {
    /** roomId → 그 방에서 내가 지금 할 일 (없는 방은 키 자체가 없다) */
    turns: Map<string, RoomTurnSummary>
    /** 아직 응답하지 않은 방 초대 — 목록 최상단 「나를 초대한 매칭」 */
    invites: MatchRoomInvite[]
    /** 참가 중인 방 id — MatchQueue 패스스루(Week 57). 매칭 리스트 안내가 "첫 참가 전"을 판정한다 */
    joinedRoomIds: string[]
}

export const EMPTY_ROOM_QUEUE: RoomQueue = { turns: new Map(), invites: [], joinedRoomIds: [] }

export const fetchRoomQueue = cache(async (userId: string): Promise<RoomQueue> => {
    const queue = await fetchMatchQueue(userId)

    const hostRoomIds = queue.rotationSessions
        .filter((s) => s.roomId && s.userId === userId)
        .map((s) => s.roomId as string)
    const closing = hostRoomIds.length > 0
        ? closeRotationRooms(queue.rotationSessions, userId, await fetchRoomGameTallies(hostRoomIds))
        : []

    const turns = rollUpRoomTurns([
        ...queue.pendingMatches.map(({ match, bucket }) => ({
            roomId: match.roomId,
            turn: turnOfBucket(bucket),
        })),
        ...closing.map((roomId) => ({ roomId, turn: 'closeRotation' as const })),
    ])

    return { turns, invites: queue.roomInvites, joinedRoomIds: queue.joinedRoomIds }
})

/**
 * 방별 대표 게임의 총수·확정 수 — 호스트 종료 차례의 재료. 관점 행은 세지 않는다.
 *
 * `personal_matches`를 직접 세면 안 된다(F-21) — SELECT 정책이 본인 행뿐이라 호스트가 requester가 아닌
 * 게임(자동 대진표는 team1[0]이 소유한다)은 호스트 눈에 없고, 총계가 실제보다 작아 「게임 입력 종료」 차례가
 * 목록·뱃지에서 빠졌다. `room_game_tallies`(0088, definer)가 참가 중인 방의 숫자만 돌려준다.
 */
async function fetchRoomGameTallies(roomIds: string[]): Promise<Record<string, { total: number; settled: number }>> {
    const supabase = await createClient()
    const { data } = await supabase.rpc('room_game_tallies', { p_room_ids: roomIds })
    const tallies: Record<string, { total: number; settled: number }> = {}
    for (const row of data ?? []) {
        tallies[row.room_id] = { total: row.total, settled: row.settled }
    }
    return tallies
}

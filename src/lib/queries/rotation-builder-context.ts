import type { MatchQueue } from '@/lib/queries/match-queue'
import type { RoomParticipant } from '@/lib/personal-matches/rotation-pool'
import type { PoolPickerProps } from '@/components/personal-matches/rotation/pool-editor-block'
import { fetchPastOpponents } from '@/lib/queries/personal-matches'
import { fetchOpponentCandidates } from '@/lib/queries/users'
import { fetchRoomParticipantCandidatesByRooms } from '@/lib/queries/match-rooms'

export type RotationBuilderContext = {
    /** 로테이션 게임 빌더의 참가자 자동완성 */
    picker: PoolPickerProps
    /** 세션 id → 빌더 풀에 끼울 사람들(방 참가자 ∪ 주최자 − 나) */
    roomParticipants: Record<string, RoomParticipant[]>
}

/**
 * 확인 요청 허브의 로테이션 빌더 컨텍스트 — 허브에서만 필요하므로 큐(레이아웃 뱃지 경로)에는 넣지 않는다.
 *
 * 카드로 그려지는 세션은 결과 입력이 열린 세션(rotationSessions)과 미응답 세션(awaitingSeatSessions, 0064)이다 —
 * 후자도 빌더를 여는 이유는 주최자가 거기서 무응답자를 게스트로 대체하기 때문이다.
 *
 * 빌더 풀은 "세션 풀 ∪ 방 참가자 − 나"인데 세션 풀에는 소유자가 없다('나 제외'로 저장된다).
 * 방 세션은 host 멤버 행이 소유자를 채워 줬지만 방 밖 세션에는 방 참가자가 없다 —
 * 수락한 참가자가 결과를 입력할 때 주최자를 게임에 넣지 못하므로 여기서 끼워 넣는다(0057).
 */
export async function fetchRotationBuilderContext(queue: MatchQueue, viewerId: string): Promise<RotationBuilderContext> {
    const sessions = [...queue.rotationSessions, ...queue.awaitingSeatSessions]
    const roomIds = [...new Set(sessions.map((s) => s.roomId).filter((id): id is string => !!id))]
    const [candidates, pastOpponents, byRoom] = await Promise.all([
        fetchOpponentCandidates(viewerId),
        fetchPastOpponents(viewerId),
        fetchRoomParticipantCandidatesByRooms(roomIds, viewerId),
    ])

    const roomParticipants = Object.fromEntries(
        sessions.map((s) => {
            const fromRoom: RoomParticipant[] = (s.roomId && byRoom[s.roomId]) || []
            const owner = s.owner?.userId && s.userId !== viewerId && !fromRoom.some((p) => p.id === s.owner?.userId)
                ? [{ id: s.owner.userId, name: s.owner.name, dominantHand: s.owner.hand, ntrp: s.owner.ntrp }]
                : []
            return [s.id, [...fromRoom, ...owner]]
        }),
    )

    return { picker: { candidates, pastOpponents, selfUserId: viewerId }, roomParticipants }
}

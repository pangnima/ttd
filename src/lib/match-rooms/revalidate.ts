import 'server-only'

import { revalidatePath } from 'next/cache'

/**
 * 매칭 룸 캐시 무효화의 단일 출처.
 * 방을 건드리는 액션이 네 파일(match-rooms/personal-matches/match-results/rotation-sessions)에
 * 흩어져 있어 무효화 누락이 반복됐다 — 출처 기록을 고치면 트리거가 방 메타·정산(is_settled)을
 * 재계산하므로, 방에 속한 기록을 바꾼 액션은 반드시 방 경로까지 무효화해야 한다.
 */

/** 방 목록 + 해당 방 상세. roomId가 없으면(방에 속하지 않은 기록) 아무것도 하지 않는다. */
export function revalidateRoomPaths(roomId?: string | null): void {
    if (!roomId) return
    revalidatePath('/match-rooms')
    revalidatePath(`/match-rooms/${roomId}`)
}

/** 방 목록만 — 방을 새로 만들어 아직 상세 경로를 캐시할 일이 없을 때 */
export function revalidateRoomList(): void {
    revalidatePath('/match-rooms')
}

import type { CourtSurface, MatchRoomDetail, MatchType } from '@/types'
import type { OpponentCandidate } from '@/lib/queries/users'

/**
 * 방 게임 구성 컨텍스트(0048) — 방장이 방 상세 '게임 추가'로 등록 폼을 열 때 넘기는 값.
 * 일시·타입·표면·코트명·메모는 방 값으로 고정되고(폼에서 수정 불가), 참가자 자동완성에 방 참가자가 최상단에 뜬다.
 */
export type RoomGameContext = {
    roomId: string
    playedAt: string
    playedTime?: string
    matchType: MatchType
    surface?: CourtSurface
    courtName?: string
    notes?: string
    participants: OpponentCandidate[]
}

/** 방장이 '게임 추가'로 게임을 붙일 수 있는 방 — 자유 기록 방, 또는 게임이 확정된 로테이션 방 (미확정 로테이션은 게임 빌더가 담당) */
export function canAddRoomGame(detail: Pick<MatchRoomDetail, 'source'>): boolean {
    const s = detail.source
    if (s.kind === 'direct') return true
    if (s.kind === 'rotation') return s.isFinalized
    return false
}

export function buildRoomGameContext(detail: MatchRoomDetail, participants: OpponentCandidate[]): RoomGameContext {
    const { room } = detail
    return {
        roomId: room.id,
        playedAt: room.playedAt,
        playedTime: room.playedTime,
        matchType: room.matchType,
        surface: room.surface,
        courtName: room.courtName,
        notes: room.notes,
        participants,
    }
}

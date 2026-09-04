import type { CourtSurface, MatchRoomDetail, MatchType } from '@/types'
import type { OpponentCandidate } from '@/lib/queries/users'

/**
 * 방 게임 구성 컨텍스트(0048·0049) — 방 참가자가 방 상세 '게임 추가'로 등록 폼을 열 때 넘기는 값.
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
    // 방장만 비회원(게스트) 상대를 자유 기록으로 남길 수 있다 — 참가자의 게임은 create_room_game(회원 상대) 전용
    viewerIsHost: boolean
}

/**
 * 게임을 붙일 수 있는 방인지 — 출처 종류만 본다. **뷰어 권한은 보지 않으므로 단독으로 쓰지 말 것**
 * (호출부는 canViewerAddRoomGame을 쓴다).
 * 미확정 로테이션은 게임 빌더가 담당하고, 확인 요청 방은 대표가 수락한 뒤에야 게임을 쌓을 수 있다.
 */
export function canAddRoomGame(detail: Pick<MatchRoomDetail, 'source'>): boolean {
    const s = detail.source
    if (s.kind === 'direct') return true
    if (s.kind === 'rotation') return s.isFinalized
    return s.requestStatus === 'accepted'
}

/** 방에 참가한 회원(방장 포함)이면 게임을 추가할 수 있다 (0049 — 입장 = 참가 = 게임 등록 자격) */
export function canViewerAddRoomGame(detail: MatchRoomDetail, viewerId: string): boolean {
    const isMember = detail.room.hostUserId === viewerId || detail.viewer?.status === 'joined'
    return isMember && canAddRoomGame(detail)
}

export function buildRoomGameContext(
    detail: MatchRoomDetail,
    participants: OpponentCandidate[],
    viewerId: string,
): RoomGameContext {
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
        viewerIsHost: room.hostUserId === viewerId,
    }
}

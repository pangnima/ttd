import type { MatchRoomDetail } from '@/types'
import type { OpponentCandidate } from '@/lib/queries/users'
import type { EditableLineupGame } from '@/lib/queries/match-rooms'
import { RoomLineupButton } from '@/components/match-rooms/room-lineup-button'
import { RoomLineupEditButton } from '@/components/match-rooms/room-lineup-edit-button'

type Props = {
    detail: MatchRoomDetail
    /** 방장에게만 채워진다 — 대진 생성·수정의 배치 대상 */
    lineupCandidates?: OpponentCandidate[]
    /** 아직 고칠 수 있는 대진(0071) — 비면 [대진 편집]이 사라진다 */
    editableLineup?: EditableLineupGame[]
    /** [자동 대진표]의 노출 조건(RPC 가드의 거울) — 호출자가 힌트·빈 상태와 같은 값을 넘긴다 */
    canLineup: boolean
}

/**
 * 게임 섹션 헤더의 방장 액션 — [자동 대진표]와 [대진 편집].
 * 참가자 액션(게임 입력·게임 추가)은 자격 판정이 달라 섹션 본체가 그대로 그린다.
 */
export function RoomGamesActions({ detail, lineupCandidates, editableLineup, canLineup }: Props) {
    if (!lineupCandidates) return null
    const schedule = {
        playedTime: detail.room.playedTime,
        durationMinutes: detail.room.durationMinutes,
        // 방이 기억한 경기당 시간(0078) — 두 팝업과 방 목록이 같은 값으로 라운드 시각을 읽어야 한다
        slotMinutes: detail.room.slotMinutes,
        courtCount: detail.room.courtCount,
    }

    return (
        <>
            {/* 대진을 미리 짜는 유일한 진입점 — 방장 전용이고 기존 게임을 덮어쓰지 않는다 (0066).
                노출 조건은 RPC 가드의 거울이다 — 정산된 방에서는 거절당하므로 그리지 않는다 (0072) */}
            {canLineup && (
                <RoomLineupButton
                    roomId={detail.room.id}
                    matchType={detail.room.matchType}
                    candidates={lineupCandidates}
                    existingGames={detail.games.length}
                    {...schedule}
                />
            )}
            {/* 저장한 대진 고치기 — 결과·협상이 없는 라인업 게임이 남아 있을 때만 (0071).
                정산된 방은 대표 게임이 전부 확정이라 editableLineup이 비고 버튼이 스스로 사라진다 */}
            {editableLineup && (
                <RoomLineupEditButton
                    roomId={detail.room.id}
                    matchType={detail.room.matchType}
                    candidates={lineupCandidates}
                    games={detail.games}
                    editable={editableLineup}
                    {...schedule}
                />
            )}
        </>
    )
}

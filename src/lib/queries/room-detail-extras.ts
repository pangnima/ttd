import 'server-only'

import type { MatchRoomDetail, PersonalMatchConfirmation, RotationSession } from '@/types'
import type { OpponentCandidate } from '@/lib/queries/users'
import type { PastOpponent } from '@/lib/queries/personal-matches'
import type { EnteredRotationGame } from '@/lib/personal-matches/rotation-entered'
import {
    fetchEditableLineupGames,
    fetchRoomGameConfirmations,
    fetchRoomLineupCandidates,
    fetchRoomParticipantCandidates,
    type EditableLineupGame,
} from '@/lib/queries/match-rooms'
import { fetchRoomRotationSession, fetchRotationSessionGames } from '@/lib/queries/rotation-sessions'
import { fetchOpponentCandidates } from '@/lib/queries/users'
import { fetchPastOpponents } from '@/lib/queries/personal-matches'
import { canViewerAddRoomGame } from '@/lib/match-rooms/room-context'

export type RoomDetailExtras = {
    isHost: boolean
    isMember: boolean
    canAdd: boolean
    /** 미확정 로테이션 방 — 게임이 더 들어올 수 있고, 세션을 닫는 건 호스트만 한다(0050) */
    isPendingRotation: boolean
    /** OpponentCandidate로 온다 — RoomParticipant(더 좁은 구조)로도 그대로 쓰인다 */
    participants: OpponentCandidate[]
    /** 자동 대진표의 배치 대상 — 호스트 본인을 포함한 참가자 전원 + 방 게스트(0069). 호스트에게만 채운다 */
    lineupCandidates: OpponentCandidate[]
    /** 아직 고칠 수 있는 대진(0071) — 비어 있으면 [대진 편집]을 그리지 않는다. 호스트에게만 채운다 */
    editableLineup: EditableLineupGame[]
    opponentCandidates: OpponentCandidate[]
    pastOpponents: PastOpponent[]
    confirmations: Record<string, PersonalMatchConfirmation>
    rotationSession: RotationSession | null
    sessionGames: EnteredRotationGame[]
}

/**
 * 룸 상세를 그리는 데 필요한 곁가지 데이터 — 상세 RPC 뒤에 오는 2웨이브.
 * 조회할지 말지가 뷰어 자격에 달려 있어(게임 추가·초대·빌더) 판정과 조회를 함께 둔다.
 */
export async function fetchRoomDetailExtras(detail: MatchRoomDetail, viewerId: string): Promise<RoomDetailExtras> {
    const roomId = detail.room.id
    const isHost = detail.room.hostUserId === viewerId
    const isMember = isHost || detail.viewer?.status === 'joined'
    const canAdd = canViewerAddRoomGame(detail, viewerId)
    const isPendingRotation = detail.source.kind === 'rotation' && !detail.source.isFinalized

    // 게임 추가 폼과 로테이션 빌더가 같은 참가자 명단·자동완성 후보를 쓰므로 한 번만 조회한다
    const needsPicker = canAdd || (isMember && isPendingRotation)
    const requestIds = detail.games.map((g) => g.sourceRequestId).filter((id): id is string => !!id)

    const [
        participants, lineupCandidates, editableLineup,
        opponentCandidates, pastOpponents, confirmations, rotationSession,
    ] = await Promise.all([
        needsPicker ? fetchRoomParticipantCandidates(roomId, viewerId) : [],
        // 대진 생성·수정은 호스트 전용이라 호스트에게만 조회한다
        isHost ? fetchRoomLineupCandidates(roomId, detail.guests) : [],
        isHost ? fetchEditableLineupGames(roomId) : [],
        // 클럽 회원 후보는 게임 폼 자동완성에만 쓴다 — [회원 초대]는 전체 회원 검색이라 이 목록이 필요 없다
        needsPicker ? fetchOpponentCandidates(viewerId) : [],
        needsPicker ? fetchPastOpponents(viewerId) : [],
        // 협상 행이 오는 게임 = 내가 결과를 입력·확인할 수 있는 게임 (RLS가 당사자만 통과시킨다)
        fetchRoomGameConfirmations(requestIds, viewerId),
        isMember && isPendingRotation ? fetchRoomRotationSession(roomId, viewerId) : null,
    ])

    // 세션에 이미 등록된 게임(0064) — 세션 id를 알아야 해서 위 웨이브 뒤에 온다.
    // 방은 참가자 여럿이 각자 넣어 중복 위험이 가장 크므로, 빌더가 목록을 보여 주고 선점 값을 만든다.
    const sessionGames = rotationSession ? await fetchRotationSessionGames(rotationSession.id) : []

    return {
        isHost, isMember, canAdd, isPendingRotation,
        participants, lineupCandidates, editableLineup,
        opponentCandidates, pastOpponents, confirmations, rotationSession, sessionGames,
    }
}

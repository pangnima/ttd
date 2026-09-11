import type { MatchRoomDetail, PersonalMatchConfirmation, RotationSession } from '@/types'
import type { OpponentCandidate } from '@/lib/queries/users'
import type { PastOpponent } from '@/lib/queries/personal-matches'
import type { EditableLineupGame } from '@/lib/queries/match-rooms'
import { EMPTY_BLOCK, TYPO } from '@/lib/dashboard/tokens'
import type { RoomGameContext } from '@/lib/match-rooms/room-context'
import { canCreateRoomLineup, roomGamesEmptyMessage } from '@/lib/match-rooms/game-status'
import { RoomGameRounds } from '@/components/match-rooms/room-game-rounds'
import { RoomGameDialog } from '@/components/match-rooms/room-game-dialog'
import { RoomGamesActions } from '@/components/match-rooms/room-games-actions'
import { RoomLineupHint } from '@/components/match-rooms/room-lineup-hint'
import { RoomRotationBuilder } from '@/components/match-rooms/room-rotation-builder'
import { guestParticipants, type RoomParticipant } from '@/lib/personal-matches/rotation-pool'
import type { PoolPickerProps } from '@/components/personal-matches/rotation/pool-editor-block'
import type { EnteredRotationGame } from '@/lib/personal-matches/rotation-entered'

export type RoomGamesSectionProps = {
    detail: MatchRoomDetail
    viewerId: string
    /** 게임 추가 자격이 있을 때만 넘어온다 (상위에서 canViewerAddRoomGame으로 판정) */
    gameCtx?: RoomGameContext
    opponentCandidates: OpponentCandidate[]
    pastOpponents: PastOpponent[]
    /** 내가 당사자인 상호 확인 게임의 협상 상태 — key = sourceRequestId */
    confirmations: Record<string, PersonalMatchConfirmation>
    /** 미확정 로테이션 방이면 세션 + 방 참가자 (룸 안 게임 빌더) */
    rotationSession?: RotationSession | null
    participants: RoomParticipant[]
    picker?: PoolPickerProps
    /** 그 세션에 이미 등록된 게임 (0064) — 빌더가 중복 입력을 눈으로 막고 선점 값을 만든다 */
    sessionGames?: EnteredRotationGame[]
    /** 자동 대진표(0066) — 방장에게만 채워진다. 참가자 전원(방장 포함)이 배치 대상 */
    lineupCandidates?: OpponentCandidate[]
    /** 아직 고칠 수 있는 대진(0071) — 비면 [대진 편집]이 사라진다. 방장에게만 채워진다 */
    editableLineup?: EditableLineupGame[]
}

/**
 * 게임 섹션 — 방의 대표 게임 전부(모집 중·결과 미입력 포함).
 * 방에 참가한 사람은 누구나 '게임 추가'로 자기가 친 게임을 올리고, 그 결과는 상대 확인으로 확정된다(0049).
 * 미확정 로테이션 방은 게임 빌더가 담당한다.
 */
export function RoomGamesSection({
    detail, viewerId, gameCtx, opponentCandidates, pastOpponents, confirmations, rotationSession, participants, picker,
    sessionGames, lineupCandidates, editableLineup,
}: RoomGamesSectionProps) {
    const isPendingRotation = detail.source.kind === 'rotation' && !detail.source.isFinalized
    const isMember = detail.room.hostUserId === viewerId || detail.viewer?.status === 'joined'
    // [자동 대진표]의 노출 조건 — 권장 힌트와 빈 상태의 방장 문구가 같은 식을 본다(버튼 없는 안내를 막는다)
    const canLineup = !!lineupCandidates
        && canCreateRoomLineup(detail, lineupCandidates.length, lineupCandidates.filter((c) => !c.isGuest).length)

    return (
        <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
                <h2 className={TYPO.h3}>게임</h2>
                {/* 로테이션 방장에게는 버튼 3개가 한꺼번에 보인다 — 좁은 화면에서 제목을 밀지 않도록 감싼다 */}
                <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
                    {/* 방장 액션 둘 — 자동 대진표·대진 편집 */}
                    <RoomGamesActions
                        detail={detail}
                        lineupCandidates={lineupCandidates}
                        editableLineup={editableLineup}
                        canLineup={canLineup}
                    />
                    {/* 미확정 로테이션 방은 참가자 누구나 자기 기준으로 게임을 넣는다 (0050) */}
                    {isPendingRotation && isMember && rotationSession && picker && (
                        <RoomRotationBuilder
                            session={rotationSession}
                            participants={[...participants, ...guestParticipants(detail.guests)]}
                            viewerId={viewerId}
                            picker={picker}
                            enteredGames={sessionGames}
                        />
                    )}
                    {gameCtx && (
                        <RoomGameDialog
                            ctx={gameCtx}
                            opponentCandidates={opponentCandidates}
                            pastOpponents={pastOpponents}
                            selfUserId={viewerId}
                        />
                    )}
                </div>
            </div>
            {detail.games.length === 0 ? (
                <div className={EMPTY_BLOCK}>{roomGamesEmptyMessage(detail, canLineup)}</div>
            ) : (
                <RoomGameRounds detail={detail} viewerId={viewerId} confirmations={confirmations} />
            )}
            {/* 권장 경기 수를 다이얼로그 밖에서 미리 말한다 (Week 47) — 버튼과 같은 조건, 같은 인원 */}
            {lineupCandidates && canLineup && (
                <RoomLineupHint detail={detail} playerCount={lineupCandidates.length} />
            )}
        </section>
    )
}

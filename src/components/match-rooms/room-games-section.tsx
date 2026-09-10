import type { MatchRoomDetail, PersonalMatchConfirmation, RotationSession } from '@/types'
import type { OpponentCandidate } from '@/lib/queries/users'
import type { PastOpponent } from '@/lib/queries/personal-matches'
import type { EditableLineupGame } from '@/lib/queries/match-rooms'
import { CARD_BASE, EMPTY_BLOCK, TYPO } from '@/lib/dashboard/tokens'
import type { RoomGameContext } from '@/lib/match-rooms/room-context'
import { canCreateRoomLineup, roomGamesEmptyMessage } from '@/lib/match-rooms/game-status'
import { RoomGameRow } from '@/components/match-rooms/room-game-row'
import { RoomGameDialog } from '@/components/match-rooms/room-game-dialog'
import { RoomLineupButton } from '@/components/match-rooms/room-lineup-button'
import { RoomLineupEditButton } from '@/components/match-rooms/room-lineup-edit-button'
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

    return (
        <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
                <h2 className={TYPO.h3}>게임</h2>
                {/* 로테이션 방장에게는 버튼 3개가 한꺼번에 보인다 — 좁은 화면에서 제목을 밀지 않도록 감싼다 */}
                <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
                    {/* 대진을 미리 짜는 유일한 진입점 — 방장 전용이고 기존 게임을 덮어쓰지 않는다 (0066).
                        노출 조건은 RPC 가드의 거울이다 — 정산된 방에서는 거절당하므로 그리지 않는다 (0072) */}
                    {lineupCandidates && canCreateRoomLineup(detail, lineupCandidates.length) && (
                        <RoomLineupButton
                            roomId={detail.room.id}
                            matchType={detail.room.matchType}
                            candidates={lineupCandidates}
                            existingGames={detail.games.length}
                            playedTime={detail.room.playedTime}
                            durationMinutes={detail.room.durationMinutes}
                            courtCount={detail.room.courtCount}
                        />
                    )}
                    {/* 저장한 대진 고치기 — 결과·협상이 없는 라인업 게임이 남아 있을 때만 (0071).
                        정산된 방은 대표 게임이 전부 확정이라 editableLineup이 비고 버튼이 스스로 사라진다 */}
                    {lineupCandidates && editableLineup && (
                        <RoomLineupEditButton
                            roomId={detail.room.id}
                            matchType={detail.room.matchType}
                            candidates={lineupCandidates}
                            games={detail.games}
                            editable={editableLineup}
                        />
                    )}
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
                <div className={EMPTY_BLOCK}>{roomGamesEmptyMessage(detail)}</div>
            ) : (
                <div className={`${CARD_BASE} divide-y divide-border`}>
                    {detail.games.map((g, i) => (
                        <RoomGameRow
                            key={g.id}
                            game={g}
                            index={i}
                            detail={detail}
                            viewerId={viewerId}
                            confirmation={g.sourceRequestId ? confirmations[g.sourceRequestId] : undefined}
                        />
                    ))}
                </div>
            )}
        </section>
    )
}

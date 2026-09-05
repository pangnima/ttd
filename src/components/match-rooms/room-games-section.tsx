import Link from 'next/link'
import type { MatchRoomDetail } from '@/types'
import type { OpponentCandidate } from '@/lib/queries/users'
import type { PastOpponent } from '@/lib/queries/personal-matches'
import { CARD_BASE, EMPTY_BLOCK, TYPO } from '@/lib/dashboard/tokens'
import type { RoomGameContext } from '@/lib/match-rooms/room-context'
import { roomGamesEmptyMessage } from '@/lib/match-rooms/game-status'
import { RoomGameRow } from '@/components/match-rooms/room-game-row'
import { RoomGameDialog } from '@/components/match-rooms/room-game-dialog'

export type RoomGamesSectionProps = {
    detail: MatchRoomDetail
    viewerId: string
    /** 게임 추가 자격이 있을 때만 넘어온다 (상위에서 canViewerAddRoomGame으로 판정) */
    gameCtx?: RoomGameContext
    opponentCandidates: OpponentCandidate[]
    pastOpponents: PastOpponent[]
}

/**
 * 게임 섹션 — 방의 대표 게임 전부(모집 중·결과 미입력 포함).
 * 방에 참가한 사람은 누구나 '게임 추가'로 자기가 친 게임을 올리고, 그 결과는 상대 확인으로 확정된다(0049).
 * 미확정 로테이션 방은 게임 빌더가 담당한다.
 */
export function RoomGamesSection({ detail, viewerId, gameCtx, opponentCandidates, pastOpponents }: RoomGamesSectionProps) {
    const isPendingRotation = detail.source.kind === 'rotation' && !detail.source.isFinalized
    const isMember = detail.room.hostUserId === viewerId || detail.viewer?.status === 'joined'

    return (
        <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
                <h2 className={TYPO.h3}>게임</h2>
                {/* Step 9에서 룸 안 게임 빌더로 대체된다 — 그때까지는 허브의 로테이션 카드로 보낸다 */}
                {isPendingRotation && isMember && (
                    <Link href="/me/match-requests" className="text-body2 font-medium text-primary hover:underline whitespace-nowrap">
                        결과 입력
                    </Link>
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
            {detail.games.length === 0 ? (
                <div className={EMPTY_BLOCK}>{roomGamesEmptyMessage(detail)}</div>
            ) : (
                <div className={`${CARD_BASE} divide-y divide-border`}>
                    {detail.games.map((g, i) => (
                        <RoomGameRow key={g.id} game={g} index={i} detail={detail} viewerId={viewerId} />
                    ))}
                </div>
            )}
        </section>
    )
}

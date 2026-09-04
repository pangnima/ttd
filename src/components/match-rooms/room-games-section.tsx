import Link from 'next/link'
import type { MatchRoomDetail } from '@/types'
import { CARD_BASE, EMPTY_BLOCK, TYPO } from '@/lib/dashboard/tokens'
import { canViewerAddRoomGame } from '@/lib/match-rooms/room-context'
import { roomGamesEmptyMessage } from '@/lib/match-rooms/game-status'
import { RoomGameRow } from '@/components/match-rooms/room-game-row'

type Props = { detail: MatchRoomDetail; viewerId: string }

/**
 * 게임 섹션 — 방의 대표 게임 전부(모집 중·결과 미입력 포함).
 * 방에 참가한 사람은 누구나 '게임 추가'로 자기가 친 게임을 올리고, 그 결과는 상대 확인으로 확정된다(0049).
 * 미확정 로테이션 방은 게임 빌더가 담당한다.
 */
export function RoomGamesSection({ detail, viewerId }: Props) {
    const canAdd = canViewerAddRoomGame(detail, viewerId)
    const isPendingRotation = detail.source.kind === 'rotation' && !detail.source.isFinalized
    const isMember = detail.room.hostUserId === viewerId || detail.viewer?.status === 'joined'

    return (
        <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
                <h2 className={TYPO.h3}>게임</h2>
                {isPendingRotation && isMember && (
                    <Link href="/me/personal-matches" className="text-body2 font-medium text-primary hover:underline whitespace-nowrap">
                        결과 입력
                    </Link>
                )}
                {canAdd && (
                    <Link href={`/me/personal-matches/new?room=${detail.room.id}`} className="text-body2 font-medium text-primary hover:underline whitespace-nowrap">
                        + 게임 추가
                    </Link>
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

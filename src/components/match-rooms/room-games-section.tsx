import Link from 'next/link'
import type { MatchRoomDetail } from '@/types'
import { CARD_BASE, EMPTY_BLOCK, TYPO } from '@/lib/dashboard/tokens'
import { canViewerAddRoomGame } from '@/lib/match-rooms/room-context'
import { RoomGameRow } from '@/components/match-rooms/room-game-row'

type Props = { detail: MatchRoomDetail; viewerId: string }

function emptyMessage(detail: MatchRoomDetail): string {
    const s = detail.source
    if (s.kind === 'rotation' && !s.isFinalized) {
        // 0050: 방에 참가한 사람 누구나 자기 기준으로 게임을 넣을 수 있다
        return '게임이 아직 없습니다. 개인 경기 기록의 "결과 입력 대기 로테이션" 카드에서 게임을 구성하세요.'
    }
    if (s.kind === 'confirmation' && s.requestStatus === 'pending') return '상대 대표가 확인 요청을 수락하면 결과를 등록할 수 있습니다.'
    return '게임이 없습니다. 함께 친 참가자로 게임을 추가하세요.'
}

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
                <div className={EMPTY_BLOCK}>{emptyMessage(detail)}</div>
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

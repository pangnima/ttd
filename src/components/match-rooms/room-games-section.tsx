import Link from 'next/link'
import type { MatchRoomDetail } from '@/types'
import { CARD_BASE, EMPTY_BLOCK, TYPO } from '@/lib/dashboard/tokens'
import { canAddRoomGame } from '@/lib/match-rooms/room-context'
import { RoomGameRow } from '@/components/match-rooms/room-game-row'

type Props = { detail: MatchRoomDetail; isHost: boolean }

function emptyMessage(detail: MatchRoomDetail, isHost: boolean): string {
    const s = detail.source
    if (s.kind === 'rotation' && !s.isFinalized) {
        return isHost
            ? '게임이 아직 없습니다. 개인 경기 기록의 "결과 입력 대기 로테이션" 카드에서 참가자 풀로 게임을 구성하세요.'
            : '게임이 아직 입력되지 않았습니다. 방장이 결과를 입력하면 여기에 표시됩니다.'
    }
    if (s.kind === 'confirmation' && s.requestStatus === 'pending') return '상대 대표가 확인 요청을 수락하면 결과를 등록할 수 있습니다.'
    return isHost ? '게임이 없습니다. 참가자로 게임을 추가하세요.' : '게임이 아직 등록되지 않았습니다.'
}

/**
 * 게임 섹션 — 방장 관점 personal_matches(room_id) 전부(모집 중·결과 미입력 포함).
 * 방장은 '게임 추가'로 들어온 참가자와 게임을 여러 건 구성한다(0048). 미확정 로테이션은 게임 빌더가 담당.
 */
export function RoomGamesSection({ detail, isHost }: Props) {
    const canAdd = isHost && canAddRoomGame(detail)

    return (
        <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
                <h2 className={TYPO.h3}>게임 <span className="text-caption text-muted-foreground font-normal">방장 관점</span></h2>
                {canAdd && (
                    <Link href={`/me/personal-matches/new?room=${detail.room.id}`} className="text-body2 font-medium text-primary hover:underline whitespace-nowrap">
                        + 게임 추가
                    </Link>
                )}
            </div>
            {detail.games.length === 0 ? (
                <div className={EMPTY_BLOCK}>{emptyMessage(detail, isHost)}</div>
            ) : (
                <div className={`${CARD_BASE} divide-y divide-border`}>
                    {detail.games.map((g, i) => (
                        <RoomGameRow key={g.id} game={g} index={i} detail={detail} isHost={isHost} />
                    ))}
                </div>
            )}
        </section>
    )
}

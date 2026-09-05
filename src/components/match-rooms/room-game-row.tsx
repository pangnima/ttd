import type { MatchRoomDetail, MatchRoomGame, PersonalMatchConfirmation } from '@/types'
import { PILL_BASE } from '@/lib/dashboard/tokens'
import { roomGameStatusLabel } from '@/lib/match-rooms/game-status'
import { buildRoomGameLine, buildRoomGameSets } from '@/lib/match-rooms/game-labels'
import { SetScoreChips } from '@/components/personal-matches/set-score-chips'
import { RoomGameActions } from '@/components/match-rooms/room-game-actions'

type Props = {
    game: MatchRoomGame
    index: number
    detail: MatchRoomDetail
    viewerId: string
    /** 내가 당사자인 상호 확인 게임에만 있다 — 결과 입력·확인 자격의 술어 */
    confirmation?: PersonalMatchConfirmation
}

/**
 * 게임 1행 — 팀 구성 + 스코어(있으면) 또는 상태 칩.
 * 결과 입력·확인은 룸 안에서 끝난다(RoomGameActions) — 팀 라벨만 뷰어 관점으로 뒤집는다.
 */
export function RoomGameRow({ game, index, detail, viewerId, confirmation }: Props) {
    const status = roomGameStatusLabel(game)
    // 당사자에게는 자기 관점, 방 안의 제3자에게는 작성자 관점 (표시 전용 — 저장 값은 그대로다)
    const viewerLine = buildRoomGameLine(game, viewerId)
    // 라인과 같은 관점의 스코어 — 상대팀 회원에게는 승패가 뒤집힌 대표 행 값이 내려온다
    const viewerSets = buildRoomGameSets(game, viewerId)

    return (
        <div className="px-4 py-3 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
                <p className="text-caption text-muted-foreground truncate">
                    {detail.source.kind === 'rotation' && <span className="tabular-nums mr-1.5">게임 {game.groupSeq ?? index + 1}</span>}
                    {viewerLine}
                </p>
                {status && (
                    <span className={`${PILL_BASE} shrink-0 border-spot/50 text-spot`}>
                        {status}
                    </span>
                )}
            </div>
            {viewerSets.length > 0 && <SetScoreChips sets={viewerSets} />}
            <div className="flex justify-end empty:hidden">
                <RoomGameActions game={game} viewerId={viewerId} confirmation={confirmation} />
            </div>
        </div>
    )
}

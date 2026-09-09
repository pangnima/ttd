import type { MatchRoomDetail, MatchRoomGame, PersonalMatchConfirmation } from '@/types'
import { PENDING_BADGE, resolveResultBadge } from '@/lib/personal-matches/result-badge'
import { MATCH_TYPE_LABELS, getMatchTypeBadgeClass } from '@/lib/dashboard/match-type-style'
import { PILL_BASE } from '@/lib/dashboard/tokens'
import { roomGameStatusBadge } from '@/lib/match-rooms/game-status'
import { buildRoomGameSets, buildRoomGameTeams } from '@/lib/match-rooms/game-labels'
import { GameScoreChips } from '@/components/personal-matches/set-score-chips'
import { RoomGameActions } from '@/components/match-rooms/room-game-actions'

type Props = {
    game: MatchRoomGame
    index: number
    detail: MatchRoomDetail
    viewerId: string
    /** 내가 당사자인 상호 확인 게임에만 있다 — 결과 입력·확인 자격의 술어 */
    confirmation?: PersonalMatchConfirmation
}

// 개인 경기 카드와 같은 배지 형태 — 룸과 개인 경기 결과가 같은 경기를 다르게 보이면 안 된다
const BADGE_BASE = 'px-2 py-1 rounded-[4px] text-caption font-bold shrink-0 whitespace-nowrap tabular-nums'
// 대기·주의 = spot (docs/color-system.md §4). 모집 중은 아직 손댈 수 없으니 미확정과 같은 형태로 둔다
const STATUS_BADGE: Record<'attention' | 'pending', string> = {
    attention: 'bg-spot/15 text-spot',
    pending: PENDING_BADGE.badgeClass,
}

/**
 * 게임 1행 — 좌측 결과 색 바 + 머리줄('타입 · 게임 N' ↔ 배지 하나) + 팀 두 줄 + 스코어 ↔ 액션.
 * 개인 경기 카드(PersonalMatchCard)와 같은 시각 순서다 — 그쪽은 좌측 날짜 열이 타입 배지를 머리에 둔다.
 * 관점 반전(game-labels)·배지 규칙(result-badge)은 기존 단일 출처를 그대로 쓴다.
 *
 * 배지는 한 행에 하나뿐이다 — roomGameStatusBadge가 스코어 있는 행에 null을 주므로
 * 상태 배지와 결과 배지가 겹치지 않는다. 경기 타입은 분류 색(cat-*)이라 그 자리와 다투지 않는다.
 * 날짜 열은 두지 않는다(일시·표면은 방 헤더에 있고 게임끼리 같다).
 */
export function RoomGameRow({ game, index, detail, viewerId, confirmation }: Props) {
    // 당사자에게는 자기 관점, 방 안의 제3자에게는 작성자 관점 (표시 전용 — 저장 값은 그대로다)
    const teams = buildRoomGameTeams(game, viewerId)
    // 라인과 같은 관점의 스코어 — 상대팀 회원에게는 승패가 뒤집힌 대표 행 값이 내려온다
    const sets = buildRoomGameSets(game, viewerId)
    const status = roomGameStatusBadge(game)
    const result = resolveResultBadge(sets)
    const gameLabel = detail.source.kind === 'rotation' ? `게임 ${game.groupSeq ?? index + 1}` : undefined
    const badge = status
        ? { label: status.label, className: STATUS_BADGE[status.tone] }
        : { label: result.label, className: result.badgeClass }

    return (
        <div className="flex items-stretch gap-3 px-3 py-3">
            <span className={`w-1 self-stretch rounded-full ${result.barClass}`} aria-hidden />

            <div className="flex-1 min-w-0">
                {/* 머리줄 — 경기 타입·게임 순번(왼쪽) ↔ 상태/결과 배지(오른쪽).
                    복식 방에서도 게임마다 남복·여복·혼복이 갈리므로 타입이 이름보다 먼저 읽혀야 한다. */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        <span className={`${PILL_BASE} shrink-0 ${getMatchTypeBadgeClass(game.matchType)}`}>
                            {MATCH_TYPE_LABELS[game.matchType]}
                        </span>
                        {gameLabel && <span className="text-caption text-muted-foreground shrink-0">{gameLabel}</span>}
                    </div>
                    <span className={`${BADGE_BASE} ${badge.className}`}>{badge.label}</span>
                </div>

                {/* 팀마다 한 줄 — 단식 당사자에게는 내 팀이 '나' 하나뿐이라 접는다(개인 카드와 동일) */}
                <div className="mt-1.5 min-w-0">
                    {teams.mine !== '나' && (
                        <p className="text-body2 font-medium text-foreground truncate">{teams.mine}</p>
                    )}
                    <p className="text-body2 font-medium text-foreground truncate">
                        <span className="text-muted-foreground">vs </span>{teams.theirs}
                    </p>
                </div>

                {/* 스코어(왼쪽) ↔ 결과 입력·확인 액션(오른쪽). 둘 다 없으면 줄 자체가 사라진다 —
                    자식을 감싸지 않아야 empty:hidden이 성립하므로 스코어는 mr-auto로 민다. */}
                <div className="flex items-center justify-end gap-2 mt-2 empty:hidden">
                    {sets.length > 0 && <GameScoreChips sets={sets} className="mr-auto" />}
                    <RoomGameActions game={game} viewerId={viewerId} confirmation={confirmation} />
                </div>
            </div>
        </div>
    )
}

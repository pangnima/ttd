import { CARD_BASE, TYPO } from '@/lib/dashboard/tokens'
import { GUIDE_CONFIRMATIONS, GUIDE_GAMES, GUIDE_ROOM_DETAIL, GUIDE_VIEWER_ID } from '@/lib/guide/fixtures'
import { RoomGameRow } from '@/components/match-rooms/room-game-row'

/** 카드 위 한 줄 — 같은 게임이 세 상태를 지나는 순서. 실제 배지·버튼이 말하는 것을 짧게 되짚는다 */
const CAPTIONS = ['1. 아직 아무도 입력 전', '2. 상대가 입력했다 — 내가 확인할 차례', '3. 전원 확인 — 확정']

/**
 * 매칭 안 게임 카드의 세 상태 — 결과 미입력 → 결과 확인 대기 → 확정(E2E S1 1.14 → 1.17 → 1.19).
 * 실제 `RoomGameRow`를 더미로 그린다. 협상 정보(`confirmation`)를 넘겨야 [결과 입력]·[결과 확인]이
 * 화면 그대로 나온다 — 안 넘기면 '참가자 확인 대기' 칩이 붙어 그림이 글을 반박한다. 확정 행만 일부러 뺀다.
 */
export function GameStatusExample() {
    return (
        <div className="space-y-4">
            {GUIDE_GAMES.map((game, i) => (
                <div key={game.id} className="space-y-1.5">
                    <p className={TYPO.captionStrong}>{CAPTIONS[i]}</p>
                    <div className={CARD_BASE}>
                        <RoomGameRow
                            game={game}
                            index={i}
                            detail={GUIDE_ROOM_DETAIL}
                            viewerId={GUIDE_VIEWER_ID}
                            confirmation={game.sourceRequestId ? GUIDE_CONFIRMATIONS[game.sourceRequestId] : undefined}
                        />
                    </div>
                </div>
            ))}
        </div>
    )
}

import { CircleDot, Hourglass } from 'lucide-react'
import { CARD_BASE } from '@/lib/dashboard/tokens'
import { ROOM_TURN_LABEL, isMyRoomTurn, type RoomTurnSummary } from '@/lib/match-rooms/room-turn'
import { ROOM_STAGE_HINT, isRoomFinished, type RoomStage } from '@/lib/match-rooms/room-stage'

type Props = {
    turn: RoomTurnSummary | null
    stage: RoomStage
}

/**
 * 룸 상단 「지금 할 일」 한 줄.
 *
 * 허브를 오가지 않고 이 화면에서 무엇을 해야 하는지 말한다. 판정은 room-turn.ts가 하고 여기서는
 * 문구와 색만 고른다 — 내 차례는 spot(주의), 상대 대기는 muted. 아래 게임 목록의 액션 버튼과
 * 같은 술어를 보므로 "배너는 할 일이 있다는데 버튼이 없는" 상태가 생기지 않는다.
 */
export function RoomTurnBanner({ turn, stage }: Props) {
    if (!turn) {
        if (!isRoomFinished(stage) && stage !== 'recruiting') return null
        return (
            <div className={`${CARD_BASE} flex items-start gap-2.5 px-4 py-3`}>
                <Hourglass className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-body2 text-muted-foreground break-keep">{ROOM_STAGE_HINT[stage]}</p>
            </div>
        )
    }

    const mine = isMyRoomTurn(turn.turn)
    return (
        <div
            className={`${CARD_BASE} flex items-start gap-2.5 px-4 py-3 ${mine ? 'border-spot/40 bg-spot/10' : ''}`}
        >
            {mine
                ? <CircleDot className="w-4 h-4 text-spot shrink-0 mt-0.5" />
                : <Hourglass className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />}
            <p className={`text-body2 break-keep ${mine ? 'text-foreground' : 'text-muted-foreground'}`}>
                <span className={mine ? 'font-medium' : ''}>{ROOM_TURN_LABEL[turn.turn]}</span>
                {turn.count > 1 && <span className="ml-1 tabular-nums text-muted-foreground">· {turn.count}건</span>}
            </p>
        </div>
    )
}

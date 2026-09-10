import type { MatchRoomDetail, MatchRoomGame, PersonalMatchConfirmation } from '@/types'
import { CARD_BASE, TYPO } from '@/lib/dashboard/tokens'
import { countJoined } from '@/lib/match-rooms/headcount'
import {
    courtSlotOf, derivedSlotMinutes, effectiveCourtCount, groupByRound, roundStartLabels,
} from '@/lib/match-rooms/court-slots'
import { RoomGameRow } from '@/components/match-rooms/room-game-row'

type Props = {
    detail: MatchRoomDetail
    viewerId: string
    confirmations: Record<string, PersonalMatchConfirmation>
}

/**
 * 방의 게임 목록 (Week 44).
 *
 * 2면 이상인 방은 **라운드로 묶어** 보여준다 — 일렬로 늘어놓으면 어느 둘이 같은 시각에 도는지 알 수 없다.
 * 라운드·코트는 저장하지 않고 목록 순서에서 파생한다(`court-slots.ts`). 자동 대진표가 같은 함수로
 * "한 라운드 안에서 같은 사람이 두 코트에 서지 않게" 뽑으므로 이 묶음은 실제로 실행할 수 있는 일정이다.
 *
 * `groupSeq`가 붙은 게임은 로테이션 빌더가 넣은 **사후 기록**이라 일정이 아니다 — 묶지 않고 아래에 잇는다.
 */
export function RoomGameRounds({ detail, viewerId, confirmations }: Props) {
    const planned = detail.games.filter((g) => g.groupSeq == null)
    const recorded = detail.games.filter((g) => g.groupSeq != null)

    const players = countJoined(detail.members) + detail.guests.length
    const courts = effectiveCourtCount(players, detail.room.matchType, detail.room.courtCount)
    const rounds = groupByRound(planned, courts)
    const starts = roundStartLabels(
        detail.room.playedTime,
        rounds.length,
        derivedSlotMinutes(detail.room.durationMinutes, rounds.length),
    )

    const row = (g: MatchRoomGame, i: number) => (
        <RoomGameRow
            key={g.id}
            game={g}
            index={i}
            detail={detail}
            viewerId={viewerId}
            confirmation={g.sourceRequestId ? confirmations[g.sourceRequestId] : undefined}
            slotLabel={courts > 1 ? `${courtSlotOf(i, courts).court}번 코트` : starts[i]}
        />
    )

    if (courts <= 1) {
        return (
            <div className={`${CARD_BASE} divide-y divide-border`}>
                {planned.map(row)}
                {recorded.map((g, i) => row(g, planned.length + i))}
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {rounds.map((round, r) => (
                <div key={r} className="space-y-1.5">
                    <p className={TYPO.eyebrow}>{`${r + 1}라운드${starts[r] ? ` · ${starts[r]}` : ''}`}</p>
                    <div className={`${CARD_BASE} divide-y divide-border`}>
                        {round.map((g, i) => row(g, r * courts + i))}
                    </div>
                </div>
            ))}
            {recorded.length > 0 && (
                <div className="space-y-1.5">
                    <p className={TYPO.eyebrow}>따로 기록한 게임</p>
                    <div className={`${CARD_BASE} divide-y divide-border`}>
                        {recorded.map((g, i) => (
                            <RoomGameRow
                                key={g.id}
                                game={g}
                                index={planned.length + i}
                                detail={detail}
                                viewerId={viewerId}
                                confirmation={g.sourceRequestId ? confirmations[g.sourceRequestId] : undefined}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

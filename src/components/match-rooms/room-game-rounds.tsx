import type { MatchRoomDetail, MatchRoomGame, PersonalMatchConfirmation } from '@/types'
import { CARD_BASE, TYPO } from '@/lib/dashboard/tokens'
import { countJoined } from '@/lib/match-rooms/headcount'
import {
    courtSlotOf, effectiveCourtCount, groupByRound, roomSlotMinutes, roundConflictNames, roundStartLabels,
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
    // 저장된 대진이 늘 라운드 규칙을 만족하지는 않는다 — 가드 이전에 저장된 대진, 손으로 추가한 게임이
    // 격자와 어긋날 수 있다. 순서에서 라운드를 파생하는 이상 화면이 그 어긋남을 말해야 한다.
    const conflicts = roundConflictNames(
        planned.map((g) => [g.ownerName, ...g.participants.map((p) => p.name)]),
        courts,
    )
    // 방장이 고른 경기당 시간이 있으면 그것을 쓴다(0078) — 없을 때만 소요 시간으로 역산한다.
    // 종전에는 늘 역산이라 "팝업은 10:30인데 방은 10:40"이 됐다(K-6).
    const starts = roundStartLabels(
        detail.room.playedTime,
        rounds.length,
        roomSlotMinutes(detail.room.slotMinutes, detail.room.durationMinutes, rounds.length),
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
                    {(conflicts[r] ?? []).length > 0 && (
                        <p className={`${TYPO.caption} text-spot break-keep`}>
                            {conflicts[r].join(', ')} — 같은 라운드에 두 번 배정되어 있습니다. [대진 편집]에서 고쳐주세요.
                        </p>
                    )}
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

'use client'

import { MatchGridCell } from '@/components/match-games/match-grid-cell'
import {
    flattenTimeSlots, buildMatchMatrix, matchMatrixKey,
    SLOT_TIME_CLASS,
    type MatchViewProps,
} from '@/lib/match-games/match-view-helpers'
import { cn } from '@/lib/utils'

// 열 위주(매트릭스) 뷰 — X축=코트, Y축=시간대. 셀 = (코트×시간대) 경기. 경기 없으면 빈 셀.
// 코트가 많으면 가로 스크롤하고 시간대 머리 열은 sticky 고정.
export function MatchGridView({
    matchGame, matchStates, courtSides, isPending, canEdit, currentUserId,
    ratingDeltaByMatch, getName, restNames,
    updateScore, confirmScore, editScore, toggleAdSide,
}: MatchViewProps) {
    const courts = [...matchGame.courts].sort((a, b) => a.order - b.order)
    const slots = flattenTimeSlots(matchGame)
    const matrix = buildMatchMatrix(matchGame.matches)

    return (
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-sm">
                <thead>
                    <tr>
                        <th className="sticky left-0 z-20 bg-card border-b border-r border-border px-3 py-3 text-left text-xs font-medium tracking-widest uppercase text-muted-foreground w-32 min-w-[8rem]">
                            시간 / 코트
                        </th>
                        {courts.map((court) => (
                            <th
                                key={court.id}
                                className="border-b border-border px-3 py-3 text-left text-xs font-semibold text-foreground min-w-[10rem]"
                            >
                                {court.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {slots.map((slot) => {
                        const rests = restNames(slot.slotId)
                        return (
                            <tr key={slot.slotId}>
                                <td className="sticky left-0 z-10 bg-card border-b border-r border-border px-3 py-3 align-top w-32 min-w-[8rem]">
                                    <p className={cn('text-sm font-semibold whitespace-nowrap', SLOT_TIME_CLASS)}>{slot.label}</p>
                                    {rests.length > 0 && (
                                        <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
                                            휴식: {rests.join(', ')}
                                        </p>
                                    )}
                                </td>
                                {courts.map((court) => {
                                    const match = matrix.get(matchMatrixKey(court.id, slot.slotId))
                                    return (
                                        <td key={court.id} className="border-b border-border p-1.5 align-top min-w-[10rem]">
                                            {match ? (
                                                <MatchGridCell
                                                    match={match}
                                                    matchGame={matchGame}
                                                    state={matchStates[match.id] ?? { sets: [{ team1: '', team2: '' }], confirmed: false }}
                                                    courtSides={courtSides}
                                                    isPending={isPending}
                                                    canEdit={canEdit}
                                                    currentUserId={currentUserId}
                                                    getName={getName}
                                                    deltas={ratingDeltaByMatch?.[match.id]}
                                                    toggleAdSide={toggleAdSide}
                                                    updateScore={updateScore}
                                                    confirmScore={confirmScore}
                                                    editScore={editScore}
                                                />
                                            ) : (
                                                <div className="h-full min-h-[3rem] flex items-center justify-center text-foreground/30 text-xs">
                                                    -
                                                </div>
                                            )}
                                        </td>
                                    )
                                })}
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}

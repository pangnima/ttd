'use client'

import { MATCH_TYPE_LABELS, getMatchTypeBadgeClass } from '@/lib/dashboard/match-type-style'
import { TeamPlayersCell, ScoreCell } from '@/components/match-games/match-game-cell-components'
import { RatingDeltaBadge } from '@/components/match-games/rating-delta-badge'
import { MatchCardItem } from '@/components/match-games/match-card-item'
import { matchPlayerIds } from '@/lib/match-games/attendance-stats'
import {
    buildSlotGroups, getWinnerSide,
    SLOT_TIME_CLASS, SELF_ROW_CLASS,
    type MatchViewProps,
} from '@/lib/match-games/match-view-helpers'
import { cn } from '@/lib/utils'

// 행 위주(리스트) 뷰 — 데스크탑 테이블(md 이상) + 모바일 카드(md 미만).
export function MatchListView({
    matchGame, matchStates, courtSides, isPending, canEdit, currentUserId,
    ratingDeltaByMatch, getName, getCourtLabel, restNames,
    updateScore, confirmScore, editScore, toggleAdSide,
}: MatchViewProps) {
    const slotGroups = buildSlotGroups(matchGame)

    return (
        <>
            {/* 데스크탑 테이블 (md 이상) */}
            <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="px-3 py-3 text-left text-xs font-medium tracking-widest uppercase text-muted-foreground whitespace-nowrap w-16">코트</th>
                            <th className="px-3 py-3 text-left text-xs font-medium tracking-widest uppercase text-muted-foreground whitespace-nowrap w-16">종류</th>
                            <th className="px-3 py-3 text-left text-xs font-medium tracking-widest uppercase text-muted-foreground">플레이어 1</th>
                            <th className="px-3 py-3 text-left text-xs font-medium tracking-widest uppercase text-muted-foreground">플레이어 2</th>
                            <th className="px-3 py-3 text-left text-xs font-medium tracking-widest uppercase text-muted-foreground">스코어</th>
                        </tr>
                    </thead>
                    <tbody>
                        {slotGroups.flatMap((group) => [
                            <tr key={`header-${group.slotId}`} className="bg-muted/30 border-y border-border">
                                <td colSpan={5} className="px-3 py-2.5 text-sm font-semibold text-foreground">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className={SLOT_TIME_CLASS}>{group.label}</span>
                                        {restNames(group.slotId).length > 0 && (
                                            <span className="text-xs font-normal text-muted-foreground">
                                                휴식: {restNames(group.slotId).join(', ')}
                                            </span>
                                        )}
                                    </div>
                                </td>
                            </tr>,
                            ...group.matches.map((match, idx) => {
                                const state = matchStates[match.id] ?? { sets: [{ team1: '', team2: '' }], confirmed: false }
                                const winner = state.confirmed ? getWinnerSide(state.sets) : null
                                const sides = courtSides[match.id]
                                const isLastInGroup = idx === group.matches.length - 1
                                const isSelfRow = !!currentUserId && matchPlayerIds(match).includes(currentUserId)
                                return (
                                    <tr
                                        key={match.id}
                                        className={cn(
                                            'transition-colors hover:bg-muted/30',
                                            !isLastInGroup && 'border-b border-border',
                                            isSelfRow && SELF_ROW_CLASS
                                        )}
                                    >
                                        <td className="px-3 py-3 font-semibold text-foreground">
                                            {getCourtLabel(match.courtId)}
                                        </td>
                                        <td className="px-3 py-3">
                                            <span className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-[4px] border ${getMatchTypeBadgeClass(match.matchType)}`}>
                                                {MATCH_TYPE_LABELS[match.matchType]}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3">
                                            {match.matchType === 'singles' ? (
                                                <span className={`text-sm transition-colors inline-flex items-center gap-1 ${winner === 'team1' ? 'font-bold text-foreground' : 'text-foreground'}`}>
                                                    {getName(match.player1Id ?? '')}
                                                    {matchGame.isFixed && <RatingDeltaBadge delta={ratingDeltaByMatch?.[match.id]?.[match.player1Id ?? '']} />}
                                                </span>
                                            ) : (
                                                <TeamPlayersCell
                                                    playerIds={match.team1 ?? []}
                                                    teamKey="team1"
                                                    winner={winner}
                                                    isFixed={matchGame.isFixed}
                                                    adPlayerId={sides?.team1 ?? null}
                                                    getName={getName}
                                                    onToggle={(teamKey, pid) => toggleAdSide(match.id, teamKey, pid)}
                                                    deltas={ratingDeltaByMatch?.[match.id]}
                                                />
                                            )}
                                        </td>
                                        <td className="px-3 py-3">
                                            {match.matchType === 'singles' ? (
                                                <span className={`text-sm transition-colors inline-flex items-center gap-1 ${winner === 'team2' ? 'font-bold text-foreground' : 'text-foreground'}`}>
                                                    {getName(match.player2Id ?? '')}
                                                    {matchGame.isFixed && <RatingDeltaBadge delta={ratingDeltaByMatch?.[match.id]?.[match.player2Id ?? '']} />}
                                                </span>
                                            ) : (
                                                <TeamPlayersCell
                                                    playerIds={match.team2 ?? []}
                                                    teamKey="team2"
                                                    winner={winner}
                                                    isFixed={matchGame.isFixed}
                                                    adPlayerId={sides?.team2 ?? null}
                                                    getName={getName}
                                                    onToggle={(teamKey, pid) => toggleAdSide(match.id, teamKey, pid)}
                                                    deltas={ratingDeltaByMatch?.[match.id]}
                                                />
                                            )}
                                        </td>
                                        <td className="px-3 py-3">
                                            <ScoreCell
                                                sets={state.sets}
                                                confirmed={state.confirmed}
                                                winner={winner}
                                                canEdit={canEdit}
                                                isPending={isPending}
                                                compact
                                                onUpdate={(si, field, val) => updateScore(match.id, si, field, val)}
                                                onConfirm={() => confirmScore(match.id)}
                                                onEdit={() => editScore(match.id)}
                                            />
                                        </td>
                                    </tr>
                                )
                            }),
                        ])}
                    </tbody>
                </table>
            </div>

            {/* 모바일 카드 리스트 (md 미만) */}
            <div className="md:hidden space-y-3">
                {slotGroups.map((group) => (
                    <div key={group.slotId}>
                        <div className="flex flex-wrap items-center justify-between gap-x-2 pb-2">
                            <p className={cn('text-sm font-semibold', SLOT_TIME_CLASS)}>{group.label}</p>
                            {restNames(group.slotId).length > 0 && (
                                <p className="text-xs text-muted-foreground">
                                    휴식: {restNames(group.slotId).join(', ')}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            {group.matches.map((match) => {
                                const state = matchStates[match.id] ?? { sets: [{ team1: '', team2: '' }], confirmed: false }
                                const winner = state.confirmed ? getWinnerSide(state.sets) : null
                                const isSelfRow = !!currentUserId && matchPlayerIds(match).includes(currentUserId)
                                return (
                                    <MatchCardItem
                                        key={match.id}
                                        match={match}
                                        matchGame={matchGame}
                                        state={state}
                                        winner={winner}
                                        courtSides={courtSides}
                                        isPending={isPending}
                                        canEdit={canEdit}
                                        getName={getName}
                                        getCourtLabel={getCourtLabel}
                                        toggleAdSide={toggleAdSide}
                                        updateScore={updateScore}
                                        confirmScore={confirmScore}
                                        editScore={editScore}
                                        deltas={ratingDeltaByMatch?.[match.id]}
                                        isSelfRow={isSelfRow}
                                    />
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </>
    )
}

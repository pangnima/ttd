'use client'

import { MATCH_TYPE_LABELS, getMatchTypeBadgeClass } from '@/lib/dashboard/match-type-style'
import { TeamPlayersCell, ScoreCell } from '@/components/match-games/match-game-cell-components'
import { TierDeltaBadge } from '@/components/common/tier-delta-badge'
import { SELF_CARD_CLASS, type MatchState, type CourtSideState, type WinnerSide } from '@/lib/match-games/match-view-helpers'
import { cn } from '@/lib/utils'
import type { RatingChange } from '@/lib/queries/ratings'
import type { MatchGame } from '@/types'

type MatchCardItemProps = {
    match: MatchGame['matches'][number]
    matchGame: MatchGame
    state: MatchState
    winner: WinnerSide
    courtSides: CourtSideState
    isPending: boolean
    canEdit: boolean
    getName: (id: string) => string
    getCourtLabel: (courtId: string) => string
    toggleAdSide: (matchId: string, teamKey: 'team1' | 'team2', playerId: string) => void
    updateScore: (matchId: string, setIndex: number, field: 'team1' | 'team2', value: string) => void
    confirmScore: (matchId: string) => void
    editScore: (matchId: string) => void
    deltas?: Record<string, RatingChange>
    isSelfRow?: boolean
}

// 모바일(md 미만) 카드 한 개 — 경기 1개를 코트/종류/선수/스코어 묶음으로 렌더.
export function MatchCardItem({
    match, matchGame, state, winner, courtSides, isPending, canEdit,
    getName, getCourtLabel, toggleAdSide, updateScore, confirmScore, editScore, deltas, isSelfRow,
}: MatchCardItemProps) {
    const sides = courtSides[match.id]
    return (
        <div className={cn(
            'rounded-xl border border-border bg-card p-4 space-y-3',
            isSelfRow && SELF_CARD_CLASS
        )}>
            <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm text-foreground shrink-0">
                    {getCourtLabel(match.courtId)}
                </span>
                <span className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-[4px] border shrink-0 ${getMatchTypeBadgeClass(match.matchType)}`}>
                    {MATCH_TYPE_LABELS[match.matchType]}
                </span>
            </div>

            <div className="space-y-2">
                {match.matchType === 'singles' ? (
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground shrink-0">P1</span>
                        <span className={`text-sm flex-1 inline-flex items-center gap-1 ${winner === 'team1' ? 'font-bold text-foreground' : 'text-foreground'}`}>
                            {getName(match.player1Id ?? '')}
                            {matchGame.isFixed && <TierDeltaBadge before={deltas?.[match.player1Id ?? '']?.before} after={deltas?.[match.player1Id ?? '']?.after} />}
                        </span>
                        <span className="text-muted-foreground text-xs mx-1">vs</span>
                        <span className={`text-sm flex-1 inline-flex items-center justify-end gap-1 text-right ${winner === 'team2' ? 'font-bold text-foreground' : 'text-foreground'}`}>
                            {getName(match.player2Id ?? '')}
                            {matchGame.isFixed && <TierDeltaBadge before={deltas?.[match.player2Id ?? '']?.before} after={deltas?.[match.player2Id ?? '']?.after} />}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">P2</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">플레이어 1</p>
                            <TeamPlayersCell
                                playerIds={match.team1 ?? []}
                                teamKey="team1"
                                winner={winner}
                                isFixed={matchGame.isFixed}
                                adPlayerId={sides?.team1 ?? null}
                                getName={getName}
                                onToggle={(teamKey, pid) => toggleAdSide(match.id, teamKey, pid)}
                                justify
                                deltas={deltas}
                            />
                        </div>
                        <div>
                            <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">플레이어 2</p>
                            <TeamPlayersCell
                                playerIds={match.team2 ?? []}
                                teamKey="team2"
                                winner={winner}
                                isFixed={matchGame.isFixed}
                                adPlayerId={sides?.team2 ?? null}
                                getName={getName}
                                onToggle={(teamKey, pid) => toggleAdSide(match.id, teamKey, pid)}
                                justify
                                deltas={deltas}
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="pt-1 border-t border-border">
                <ScoreCell
                    sets={state.sets}
                    confirmed={state.confirmed}
                    winner={winner}
                    canEdit={canEdit}
                    isPending={isPending}
                    onUpdate={(si, field, val) => updateScore(match.id, si, field, val)}
                    onConfirm={() => confirmScore(match.id)}
                    onEdit={() => editScore(match.id)}
                />
            </div>
        </div>
    )
}

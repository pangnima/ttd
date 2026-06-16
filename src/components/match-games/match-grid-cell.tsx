'use client'

import { MATCH_TYPE_LABELS, getMatchTypeBadgeClass } from '@/lib/dashboard/match-type-style'
import { TeamPlayersCell, ScoreCell } from '@/components/match-games/match-game-cell-components'
import { SpecialMatchBadge } from '@/components/match-games/special-match-badge'
import { matchPlayerIds } from '@/lib/match-games/attendance-stats'
import { isCloseMatch } from '@/lib/match-games/special-match'
import {
    getWinnerSide, SELF_CARD_CLASS,
    type MatchState, type CourtSideState,
} from '@/lib/match-games/match-view-helpers'
import { cn } from '@/lib/utils'
import type { RatingChange, ClubRating } from '@/lib/queries/ratings'
import type { MatchGame } from '@/types'

type MatchGridCellProps = {
    match: MatchGame['matches'][number]
    matchGame: MatchGame
    state: MatchState
    courtSides: CourtSideState
    isPending: boolean
    canEdit: boolean
    currentUserId?: string
    getName: (id: string) => string
    deltas?: Record<string, RatingChange>
    ratingByUser?: Record<string, ClubRating>
    isRival?: boolean
    toggleAdSide: (matchId: string, teamKey: 'team1' | 'team2', playerId: string) => void
    updateScore: (matchId: string, setIndex: number, field: 'team1' | 'team2', value: string) => void
    confirmScore: (matchId: string) => void
    editScore: (matchId: string) => void
}

// 매트릭스 셀 1개 — 종류 배지 + 선수(복식 TeamPlayersCell/단식 직접) + 스코어를 세로로 압축.
export function MatchGridCell({
    match, matchGame, state, courtSides, isPending, canEdit, currentUserId,
    getName, deltas, ratingByUser, isRival, toggleAdSide, updateScore, confirmScore, editScore,
}: MatchGridCellProps) {
    const winner = state.confirmed ? getWinnerSide(state.sets) : null
    const sides = courtSides[match.id]
    const isSelf = !!currentUserId && matchPlayerIds(match).includes(currentUserId)
    const isClose = state.confirmed && isCloseMatch(state.sets, winner)

    // 단식도 복식과 동일한 행 배치로 통일 — player1=team1, player2=team2 (단식은 듀스/애드 토글 숨김).
    const isSingles = match.matchType === 'singles'
    const team1Ids = isSingles ? [match.player1Id].filter((id): id is string => Boolean(id)) : (match.team1 ?? [])
    const team2Ids = isSingles ? [match.player2Id].filter((id): id is string => Boolean(id)) : (match.team2 ?? [])

    return (
        <div className={cn(
            'h-full flex flex-col rounded-lg border border-border bg-card p-2 gap-2',
            isSelf && SELF_CARD_CLASS
        )}>
            <div className="flex items-center justify-between gap-1">
                <span className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-[4px] border ${getMatchTypeBadgeClass(match.matchType)}`}>
                    {MATCH_TYPE_LABELS[match.matchType]}
                </span>
                <SpecialMatchBadge close={isClose} rival={isRival} />
            </div>

            <div className="space-y-1.5">
                <TeamPlayersCell
                    playerIds={team1Ids}
                    teamKey="team1"
                    winner={winner}
                    isFixed={matchGame.isFixed}
                    adPlayerId={sides?.team1 ?? null}
                    getName={getName}
                    onToggle={(teamKey, pid) => toggleAdSide(match.id, teamKey, pid)}
                    deltas={deltas}
                    ratingByUser={ratingByUser}
                    hideSideToggle={isSingles}
                />
                <div className="border-t border-border/60" />
                <TeamPlayersCell
                    playerIds={team2Ids}
                    teamKey="team2"
                    winner={winner}
                    isFixed={matchGame.isFixed}
                    adPlayerId={sides?.team2 ?? null}
                    getName={getName}
                    onToggle={(teamKey, pid) => toggleAdSide(match.id, teamKey, pid)}
                    deltas={deltas}
                    ratingByUser={ratingByUser}
                    hideSideToggle={isSingles}
                />
            </div>

            <div className="mt-auto pt-1.5 border-t border-border">
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
            </div>
        </div>
    )
}

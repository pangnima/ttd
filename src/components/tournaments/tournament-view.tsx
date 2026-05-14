'use client'

import { useState, useCallback, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GameScoreDialog } from '@/components/tournaments/game-score-dialog'
import { getStoredTournamentById, saveTournament } from '@/lib/store/tournament-store'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Court, Game, GameResult, Round, Tournament, User } from '@/types'

type TournamentViewProps = {
    tournament: Tournament
    members: User[]
    clubOwnerId: string
}

const MATCH_TYPE_LABEL: Record<string, string> = {
    singles: '단식',
    men_doubles: '남복',
    women_doubles: '여복',
    mixed_doubles: '혼복',
}

const MATCH_TYPE_STYLE: Record<string, string> = {
    singles: 'bg-white text-zinc-900 border border-zinc-200',
    men_doubles: 'bg-blue-50 text-blue-800 border border-blue-200',
    women_doubles: 'bg-pink-50 text-pink-800 border border-pink-200',
    mixed_doubles: 'bg-purple-50 text-purple-800 border border-purple-200',
}

export function TournamentView({ tournament: initial, members, clubOwnerId }: TournamentViewProps) {
    const [tournament, setTournament] = useState<Tournament>(initial)
    const [selectedGame, setSelectedGame] = useState<Game | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [isOwner, setIsOwner] = useState(false)

    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(({ data: { user } }) => {
            setIsOwner(user?.id === clubOwnerId)
        })
    }, [clubOwnerId])

    // localStorage에 저장된 게임 결과 병합 (더미 대진표 포함)
    useEffect(() => {
        const stored = getStoredTournamentById(initial.id)
        if (!stored) return
        setTournament((prev) => {
            const storedGameMap = new Map(stored.games.map((g) => [g.id, g]))
            return {
                ...prev,
                ...stored,
                games: prev.games.map((g) => storedGameMap.get(g.id) ?? g),
                isFixed: stored.isFixed,
            }
        })
    }, [initial.id])

    const getPlayerName = useCallback(
        (userId: string) => members.find((u) => u.id === userId)?.nickname ?? userId,
        [members]
    )

    const getTeamLabel = (game: Game, team: 'team1' | 'team2') => {
        const ids = game[team] ?? []
        return ids.map(getPlayerName).join(' / ')
    }

    const getSideLabel = (game: Game, side: 'a' | 'b') => {
        if (game.matchType === 'singles') {
            return side === 'a'
                ? getPlayerName(game.player1Id ?? '')
                : getPlayerName(game.player2Id ?? '')
        }
        return getTeamLabel(game, side === 'a' ? 'team1' : 'team2')
    }

    const getGamesForCell = (round: Round, court: Court, timeSlotId: string): Game[] =>
        tournament.games.filter(
            (g) =>
                g.roundId === round.id &&
                g.courtId === court.id &&
                g.timeSlotId === timeSlotId
        )

    const handleGameClick = (game: Game) => {
        if (tournament.isFixed && !isOwner) return
        setSelectedGame(game)
        setDialogOpen(true)
    }

    const handleSaveScore = (gameId: string, result: GameResult) => {
        setTournament((prev) => {
            const updated = {
                ...prev,
                games: prev.games.map((g) =>
                    g.id === gameId ? { ...g, status: 'finished' as const, result } : g
                ),
            }
            // 더미 대진표든 신규 대진표든 전체를 localStorage에 저장
            saveTournament(updated)
            return updated
        })
    }

    const allFinished = tournament.games.length > 0 &&
        tournament.games.every((g) => g.status === 'finished')

    const handleFix = () => {
        setTournament((prev) => {
            const updated = { ...prev, isFixed: true }
            saveTournament(updated)
            return updated
        })
    }

    return (
        <div className="w-full space-y-4">
            {/* 헤더 */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">{tournament.name}</h1>
                    <p className="text-sm text-muted-foreground mt-1">{tournament.date}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {tournament.isFixed ? (
                        <Badge variant="secondary">확정됨</Badge>
                    ) : (
                        isOwner && (
                            <Button
                                size="sm"
                                disabled={!allFinished}
                                onClick={handleFix}
                                title={allFinished ? '' : '모든 경기 결과 입력 후 확정 가능'}
                            >
                                Fix
                            </Button>
                        )
                    )}
                </div>
            </div>

            {/* 범례 */}
            <div className="flex flex-wrap gap-2">
                {Object.entries(MATCH_TYPE_LABEL).map(([type, label]) => (
                    <span
                        key={type}
                        className={cn('text-xs px-2 py-0.5 rounded', MATCH_TYPE_STYLE[type])}
                    >
                        {label}
                    </span>
                ))}
            </div>

            {/* 표 */}
            <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="bg-muted/40">
                            <th className="px-3 py-2 text-left font-medium text-xs text-muted-foreground border-b border-r border-border w-28">
                                라운드 / 시간
                            </th>
                            {tournament.courts.map((court) => (
                                <th
                                    key={court.id}
                                    className="px-3 py-2 text-center font-medium text-xs text-muted-foreground border-b border-r border-border last:border-r-0 min-w-[140px]"
                                >
                                    {court.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {tournament.rounds.map((round) =>
                            round.timeSlots.map((slot, slotIdx) => (
                                <tr
                                    key={`${round.id}-${slot.id}`}
                                    className="border-b border-border last:border-b-0"
                                >
                                    {/* 라운드 + 시간 셀 */}
                                    <td className="px-3 py-2 border-r border-border align-top">
                                        {slotIdx === 0 && (
                                            <span className="block font-semibold text-xs mb-1">
                                                {round.label}
                                            </span>
                                        )}
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                            {slot.startAt}~{slot.endAt}
                                        </span>
                                    </td>

                                    {/* 코트별 게임 셀 */}
                                    {tournament.courts.map((court) => {
                                        const games = getGamesForCell(round, court, slot.id)
                                        return (
                                            <td
                                                key={court.id}
                                                className="px-2 py-2 border-r border-border last:border-r-0 align-top"
                                            >
                                                <div className="space-y-1.5">
                                                    {games.map((game) => (
                                                        <GameCard
                                                            key={game.id}
                                                            game={game}
                                                            sideALabel={getSideLabel(game, 'a')}
                                                            sideBLabel={getSideLabel(game, 'b')}
                                                            isFixed={tournament.isFixed}
                                                            isOwner={isOwner}
                                                            onClick={() => handleGameClick(game)}
                                                        />
                                                    ))}
                                                    {games.length === 0 && (
                                                        <span className="text-xs text-muted-foreground/40">—</span>
                                                    )}
                                                </div>
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* 점수 입력 모달 */}
            <GameScoreDialog
                game={selectedGame}
                open={dialogOpen}
                readOnly={tournament.isFixed && !isOwner}
                getPlayerName={getPlayerName}
                onClose={() => setDialogOpen(false)}
                onSave={handleSaveScore}
            />
        </div>
    )
}

type GameCardProps = {
    game: Game
    sideALabel: string
    sideBLabel: string
    isFixed: boolean
    isOwner: boolean
    onClick: () => void
}

function GameCard({ game, sideALabel, sideBLabel, isFixed, isOwner, onClick }: GameCardProps) {
    const clickable = !isFixed || isOwner
    const result = game.result

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={!clickable}
            className={cn(
                'w-full text-left rounded p-2 text-xs transition-all',
                MATCH_TYPE_STYLE[game.matchType],
                clickable ? 'cursor-pointer hover:opacity-80 active:scale-95' : 'cursor-default opacity-70'
            )}
        >
            <div className="font-medium mb-1 truncate">{sideALabel}</div>
            <div className="text-center opacity-50 text-[10px] my-0.5">vs</div>
            <div className="font-medium truncate">{sideBLabel}</div>

            {result && (
                <div className="mt-1.5 pt-1.5 border-t border-current/10 text-center font-semibold">
                    {result.sets.map((s, i) => (
                        <span key={i} className="mx-0.5">{s.team1}:{s.team2}</span>
                    ))}
                </div>
            )}

            {!result && (
                <div className="mt-1.5 pt-1.5 border-t border-current/10 text-center opacity-40 text-[10px]">
                    결과 미입력
                </div>
            )}
        </button>
    )
}

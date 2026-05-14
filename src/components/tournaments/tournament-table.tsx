'use client'

import { useState, useEffect } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Trash2, Check } from 'lucide-react'
import { getStoredTournamentById, saveTournament } from '@/lib/store/tournament-store'
import type { GameResult, MatchType, Tournament, User } from '@/types'

type SetScore = { team1: string; team2: string }
type GameState = { sets: SetScore[]; confirmed: boolean }
type GameStates = Record<string, GameState>

type TournamentTableProps = {
    tournament: Tournament
    members: User[]
}

const MATCH_TYPE_LABELS: Record<MatchType, string> = {
    singles: '단식',
    men_doubles: '남복',
    women_doubles: '여복',
    mixed_doubles: '혼복',
}

const MATCH_TYPE_VARIANTS: Record<MatchType, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    singles: 'default',
    men_doubles: 'secondary',
    women_doubles: 'outline',
    mixed_doubles: 'destructive',
}

function getWinner(sets: SetScore[]): 'team1' | 'team2' | null {
    let team1Wins = 0
    let team2Wins = 0
    for (const set of sets) {
        const s1 = parseInt(set.team1) || 0
        const s2 = parseInt(set.team2) || 0
        if (s1 > s2) team1Wins++
        else if (s2 > s1) team2Wins++
    }
    if (team1Wins > team2Wins) return 'team1'
    if (team2Wins > team1Wins) return 'team2'
    return null
}

export function TournamentTable({ tournament, members }: TournamentTableProps) {
    const [gameStates, setGameStates] = useState<GameStates>(() => {
        const initial: GameStates = {}
        for (const game of tournament.games) {
            if (game.result) {
                const firstSet = game.result.sets[0]
                initial[game.id] = {
                    sets: [{ team1: String(firstSet?.team1 ?? ''), team2: String(firstSet?.team2 ?? '') }],
                    confirmed: true,
                }
            } else {
                initial[game.id] = { sets: [{ team1: '', team2: '' }], confirmed: false }
            }
        }
        return initial
    })

    useEffect(() => {
        const stored = getStoredTournamentById(tournament.id)
        if (!stored) return
        setGameStates((prev) => {
            const merged = { ...prev }
            for (const game of stored.games) {
                if (game.result) {
                    merged[game.id] = {
                        sets: game.result.sets.map((s) => ({
                            team1: String(s.team1),
                            team2: String(s.team2),
                        })),
                        confirmed: true,
                    }
                }
            }
            return merged
        })
    }, [tournament.id])

    const userMap = new Map(members.map((m) => [m.id, m.nickname]))

    function getName(id: string): string {
        return userMap.get(id) ?? id
    }

    function getTeamNames(ids?: string[]): string {
        if (!ids || ids.length === 0) return '-'
        return ids.map(getName).join(' / ')
    }

    function getCourtLabel(courtId: string): string {
        return tournament.courts.find((c) => c.id === courtId)?.label ?? courtId
    }

    function getTimeSlot(timeSlotId: string): string {
        for (const round of tournament.rounds) {
            const ts = round.timeSlots.find((t) => t.id === timeSlotId)
            if (ts) return `${ts.startAt} ~ ${ts.endAt}`
        }
        return timeSlotId
    }

    function updateScore(gameId: string, setIndex: number, field: 'team1' | 'team2', value: string) {
        setGameStates((prev) => {
            const state = prev[gameId]
            const sets = [...state.sets]
            sets[setIndex] = { ...sets[setIndex], [field]: value }
            return { ...prev, [gameId]: { ...state, sets } }
        })
    }

    function confirmScore(gameId: string) {
        const newStates = {
            ...gameStates,
            [gameId]: { ...gameStates[gameId], confirmed: true },
        }

        const updatedGames = tournament.games.map((g) => {
            const state = newStates[g.id]
            if (!state?.confirmed) return g
            const sets = state.sets.map((s) => ({
                team1: parseInt(s.team1) || 0,
                team2: parseInt(s.team2) || 0,
            }))
            const winnerSide = getWinner(state.sets)
            const winnerId =
                g.matchType === 'singles'
                    ? winnerSide === 'team1' ? (g.player1Id ?? '') : (g.player2Id ?? '')
                    : winnerSide ?? 'team1'
            return { ...g, status: 'finished' as const, result: { sets, winnerId } as GameResult }
        })
        saveTournament({ ...tournament, games: updatedGames })

        setGameStates(newStates)
    }

    function editScore(gameId: string) {
        setGameStates((prev) => ({
            ...prev,
            [gameId]: { ...prev[gameId], confirmed: false },
        }))
    }

    const sortedGames = [...tournament.games].sort((a, b) => {
        const courtA = tournament.courts.find((c) => c.id === a.courtId)?.order ?? 0
        const courtB = tournament.courts.find((c) => c.id === b.courtId)?.order ?? 0
        if (courtA !== courtB) return courtA - courtB
        return a.timeSlotId.localeCompare(b.timeSlotId)
    })

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-12">코트</TableHead>
                        <TableHead className="w-28">시간</TableHead>
                        <TableHead className="w-14">종류</TableHead>
                        <TableHead className="w-36">플레이어 1</TableHead>
                        <TableHead className="w-36">플레이어 2</TableHead>
                        <TableHead>스코어</TableHead>
                        <TableHead className="w-16 text-right">관리</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedGames.map((game) => {
                        const player1 = game.matchType === 'singles'
                            ? getName(game.player1Id ?? '')
                            : getTeamNames(game.team1)
                        const player2 = game.matchType === 'singles'
                            ? getName(game.player2Id ?? '')
                            : getTeamNames(game.team2)

                        const state = gameStates[game.id] ?? { sets: [{ team1: '', team2: '' }], confirmed: false }
                        const winner = state.confirmed ? getWinner(state.sets) : null

                        return (
                            <TableRow key={game.id}>
                                <TableCell className="text-sm font-medium">
                                    {getCourtLabel(game.courtId)}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                    {getTimeSlot(game.timeSlotId)}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={MATCH_TYPE_VARIANTS[game.matchType]} className="text-xs px-1.5">
                                        {MATCH_TYPE_LABELS[game.matchType]}
                                    </Badge>
                                </TableCell>
                                <TableCell className={`text-sm max-w-36 truncate transition-colors ${winner === 'team1' ? 'font-semibold text-primary' : ''}`}>
                                    {player1}
                                </TableCell>
                                <TableCell className={`text-sm max-w-36 truncate transition-colors ${winner === 'team2' ? 'font-semibold text-primary' : ''}`}>
                                    {player2}
                                </TableCell>
                                <TableCell>
                                    {state.confirmed ? (
                                        <div className="flex items-center gap-1.5 text-sm font-mono">
                                            <span className={winner === 'team1' ? 'font-bold text-primary' : 'text-muted-foreground'}>
                                                {state.sets[0].team1}
                                            </span>
                                            <span className="text-xs text-muted-foreground">:</span>
                                            <span className={winner === 'team2' ? 'font-bold text-primary' : 'text-muted-foreground'}>
                                                {state.sets[0].team2}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="text"
                                                value={state.sets[0].team1}
                                                onChange={(e) => updateScore(game.id, 0, 'team1', e.target.value)}
                                                className="h-6 w-10 text-center text-xs px-1"
                                                placeholder="P1"
                                            />
                                            <span className="text-xs text-muted-foreground">:</span>
                                            <Input
                                                type="text"
                                                value={state.sets[0].team2}
                                                onChange={(e) => updateScore(game.id, 0, 'team2', e.target.value)}
                                                className="h-6 w-10 text-center text-xs px-1"
                                                placeholder="P2"
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-primary hover:text-primary hover:bg-primary/10"
                                                onClick={() => confirmScore(game.id)}
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => editScore(game.id)}
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-destructive hover:text-destructive"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
    )
}

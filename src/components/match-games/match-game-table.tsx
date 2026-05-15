'use client'

import { useState, useTransition } from 'react'
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
import { Pencil, Check } from 'lucide-react'
import { saveMatchResultAction } from '@/lib/actions/match-games'
import type { MatchType, MatchGame, User } from '@/types'

type SetScore = { team1: string; team2: string }
type MatchState = { sets: SetScore[]; confirmed: boolean }
type MatchStates = Record<string, MatchState>

type MatchGameTableProps = {
    matchGame: MatchGame
    members: User[]
    clubId: string
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

function getWinnerSide(sets: SetScore[]): 'team1' | 'team2' | null {
    let t1 = 0
    let t2 = 0
    for (const set of sets) {
        const s1 = parseInt(set.team1) || 0
        const s2 = parseInt(set.team2) || 0
        if (s1 > s2) t1++
        else if (s2 > s1) t2++
    }
    if (t1 > t2) return 'team1'
    if (t2 > t1) return 'team2'
    return null
}

export function MatchGameTable({ matchGame, members, clubId }: MatchGameTableProps) {
    const [isPending, startTransition] = useTransition()
    const [matchStates, setMatchStates] = useState<MatchStates>(() => {
        const initial: MatchStates = {}
        for (const match of matchGame.matches) {
            if (match.result) {
                const firstSet = match.result.sets[0]
                initial[match.id] = {
                    sets: [{ team1: String(firstSet?.team1 ?? ''), team2: String(firstSet?.team2 ?? '') }],
                    confirmed: true,
                }
            } else {
                initial[match.id] = { sets: [{ team1: '', team2: '' }], confirmed: false }
            }
        }
        return initial
    })

    const userMap = new Map(members.map((m) => [m.id, m.nickname]))

    function getName(id: string): string {
        return userMap.get(id) ?? id
    }

    function getTeamNames(ids?: string[]): string {
        if (!ids || ids.length === 0) return '-'
        return ids.map(getName).join(' / ')
    }

    function getCourtLabel(courtId: string): string {
        return matchGame.courts.find((c) => c.id === courtId)?.label ?? courtId
    }

    function getTimeSlot(timeSlotId: string): string {
        for (const round of matchGame.rounds) {
            const ts = round.timeSlots.find((t) => t.id === timeSlotId)
            if (ts) return `${ts.startAt} ~ ${ts.endAt}`
        }
        return timeSlotId
    }

    function updateScore(matchId: string, setIndex: number, field: 'team1' | 'team2', value: string) {
        setMatchStates((prev) => {
            const state = prev[matchId]
            const sets = [...state.sets]
            sets[setIndex] = { ...sets[setIndex], [field]: value }
            return { ...prev, [matchId]: { ...state, sets } }
        })
    }

    function confirmScore(matchId: string) {
        const state = matchStates[matchId]
        const winnerSide = getWinnerSide(state.sets)
        if (!winnerSide) return

        const sets = state.sets.map((s) => ({
            team1: parseInt(s.team1) || 0,
            team2: parseInt(s.team2) || 0,
        }))

        setMatchStates((prev) => ({
            ...prev,
            [matchId]: { ...prev[matchId], confirmed: true },
        }))

        startTransition(async () => {
            await saveMatchResultAction(clubId, matchGame.id, matchId, sets, winnerSide)
        })
    }

    function editScore(matchId: string) {
        setMatchStates((prev) => ({
            ...prev,
            [matchId]: { ...prev[matchId], confirmed: false },
        }))
    }

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
                    {matchGame.matches.map((match) => {
                        const player1 = match.matchType === 'singles'
                            ? getName(match.player1Id ?? '')
                            : getTeamNames(match.team1)
                        const player2 = match.matchType === 'singles'
                            ? getName(match.player2Id ?? '')
                            : getTeamNames(match.team2)

                        const state = matchStates[match.id] ?? { sets: [{ team1: '', team2: '' }], confirmed: false }
                        const winner = state.confirmed ? getWinnerSide(state.sets) : null

                        return (
                            <TableRow key={match.id}>
                                <TableCell className="text-sm font-medium">
                                    {getCourtLabel(match.courtId)}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                    {getTimeSlot(match.timeSlotId)}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={MATCH_TYPE_VARIANTS[match.matchType]} className="text-xs px-1.5">
                                        {MATCH_TYPE_LABELS[match.matchType]}
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
                                                onChange={(e) => updateScore(match.id, 0, 'team1', e.target.value)}
                                                className="h-6 w-10 text-center text-xs px-1"
                                                placeholder="P1"
                                            />
                                            <span className="text-xs text-muted-foreground">:</span>
                                            <Input
                                                type="text"
                                                value={state.sets[0].team2}
                                                onChange={(e) => updateScore(match.id, 0, 'team2', e.target.value)}
                                                className="h-6 w-10 text-center text-xs px-1"
                                                placeholder="P2"
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-primary hover:text-primary hover:bg-primary/10"
                                                onClick={() => confirmScore(match.id)}
                                                disabled={isPending}
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => editScore(match.id)}
                                        disabled={isPending}
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
    )
}

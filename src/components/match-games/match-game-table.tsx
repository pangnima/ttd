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
import { Pencil, Check, Trophy } from 'lucide-react'
import { saveMatchResultAction, confirmMatchGameAction, saveCourtSidesAction } from '@/lib/actions/match-games'
import type { MatchType, MatchGame, User } from '@/types'

type SetScore = { team1: string; team2: string }
type MatchState = { sets: SetScore[]; confirmed: boolean }
type MatchStates = Record<string, MatchState>
type CourtSideState = Record<string, { team1: string | null; team2: string | null }>

type MatchGameTableProps = {
    matchGame: MatchGame
    members: User[]
    clubId: string
    isOwner?: boolean
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

function getWinnerSide(sets: SetScore[]): 'team1' | 'team2' | 'draw' | null {
    let t1 = 0
    let t2 = 0
    let hasInput = false
    for (const set of sets) {
        const s1 = parseInt(set.team1)
        const s2 = parseInt(set.team2)
        if (!Number.isNaN(s1) || !Number.isNaN(s2)) hasInput = true
        if ((isNaN(s1) ? 0 : s1) > (isNaN(s2) ? 0 : s2)) t1++
        else if ((isNaN(s2) ? 0 : s2) > (isNaN(s1) ? 0 : s1)) t2++
    }
    if (!hasInput) return null
    if (t1 > t2) return 'team1'
    if (t2 > t1) return 'team2'
    return 'draw'
}

export function MatchGameTable({ matchGame, members, clubId, isOwner = false }: MatchGameTableProps) {
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
    const [courtSides, setCourtSides] = useState<CourtSideState>(() => {
        const initial: CourtSideState = {}
        for (const match of matchGame.matches) {
            initial[match.id] = {
                team1: match.team1AdPlayerId ?? null,
                team2: match.team2AdPlayerId ?? null,
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
        if (winnerSide === null) return

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

    function toggleAdSide(matchId: string, teamKey: 'team1' | 'team2', playerId: string) {
        const current = courtSides[matchId]
        const newAdId = current[teamKey] === playerId ? null : playerId
        const nextSides = { ...current, [teamKey]: newAdId }
        setCourtSides((prev) => ({ ...prev, [matchId]: nextSides }))
        startTransition(async () => {
            await saveCourtSidesAction(clubId, matchGame.id, matchId, nextSides.team1, nextSides.team2)
        })
    }

    function handleConfirmMatchGame() {
        startTransition(async () => {
            await confirmMatchGameAction(clubId, matchGame.id)
        })
    }

    const allConfirmed = matchGame.matches.length > 0 &&
        matchGame.matches.every((m) => matchStates[m.id]?.confirmed === true)

    const canConfirm = isOwner && allConfirmed && !matchGame.isFixed
    const canEdit = !matchGame.isFixed || isOwner

    return (
        <div className="space-y-3">
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
                                {match.matchType === 'singles' ? (
                                    <TableCell className={`text-sm max-w-36 truncate transition-colors ${winner === 'team1' ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                                        {player1}
                                    </TableCell>
                                ) : (
                                    <TableCell className="text-sm">
                                        <div className="space-y-1">
                                            {(match.team1 ?? []).map((pid) => {
                                                const isAd = courtSides[match.id]?.team1 === pid
                                                return (
                                                    <div key={pid} className="flex items-center gap-1.5">
                                                        <span className={`truncate max-w-[72px] ${winner === 'team1' ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                                                            {getName(pid)}
                                                        </span>
                                                        {!matchGame.isFixed ? (
                                                            <button
                                                                onClick={() => toggleAdSide(match.id, 'team1', pid)}
                                                                disabled={isPending}
                                                                className={`text-[10px] px-1 py-0.5 rounded border shrink-0 leading-none ${isAd ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}
                                                            >
                                                                {isAd ? '애드(백)' : '듀스(포)'}
                                                            </button>
                                                        ) : (
                                                            <span className="text-[10px] text-muted-foreground shrink-0">
                                                                {isAd ? '애드(백)' : '듀스(포)'}
                                                            </span>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </TableCell>
                                )}
                                {match.matchType === 'singles' ? (
                                    <TableCell className={`text-sm max-w-36 truncate transition-colors ${winner === 'team2' ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                                        {player2}
                                    </TableCell>
                                ) : (
                                    <TableCell className="text-sm">
                                        <div className="space-y-1">
                                            {(match.team2 ?? []).map((pid) => {
                                                const isAd = courtSides[match.id]?.team2 === pid
                                                return (
                                                    <div key={pid} className="flex items-center gap-1.5">
                                                        <span className={`truncate max-w-[72px] ${winner === 'team2' ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                                                            {getName(pid)}
                                                        </span>
                                                        {!matchGame.isFixed ? (
                                                            <button
                                                                onClick={() => toggleAdSide(match.id, 'team2', pid)}
                                                                disabled={isPending}
                                                                className={`text-[10px] px-1 py-0.5 rounded border shrink-0 leading-none ${isAd ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}
                                                            >
                                                                {isAd ? '애드(백)' : '듀스(포)'}
                                                            </button>
                                                        ) : (
                                                            <span className="text-[10px] text-muted-foreground shrink-0">
                                                                {isAd ? '애드(백)' : '듀스(포)'}
                                                            </span>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </TableCell>
                                )}
                                <TableCell>
                                    {state.confirmed ? (
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1.5 text-sm font-mono">
                                                <span className={winner === 'team1' ? 'font-black text-foreground' : 'text-muted-foreground/50'}>
                                                    {state.sets[0].team1}
                                                </span>
                                                <span className="text-xs text-muted-foreground">:</span>
                                                <span className={winner === 'team2' ? 'font-black text-foreground' : 'text-muted-foreground/50'}>
                                                    {state.sets[0].team2}
                                                </span>
                                            </div>
                                            {canEdit && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 shrink-0"
                                                    onClick={() => editScore(match.id)}
                                                    disabled={isPending}
                                                >
                                                    <Pencil className="w-3 h-3" />
                                                </Button>
                                            )}
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
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
        {canConfirm && (
            <div className="flex justify-end">
                <Button
                    size="sm"
                    onClick={handleConfirmMatchGame}
                    disabled={isPending}
                    className="gap-1.5"
                >
                    <Trophy className="w-4 h-4" />
                    결과 확정
                </Button>
            </div>
        )}
        </div>
    )
}

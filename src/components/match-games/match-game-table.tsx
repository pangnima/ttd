'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
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

const MATCH_TYPE_COLORS: Record<MatchType, string> = {
    singles:        'border-cyan-400/40 text-cyan-400/80 bg-cyan-400/8',
    men_doubles:    'border-blue-400/40 text-blue-400/80 bg-blue-400/8',
    women_doubles:  'border-purple-400/40 text-purple-400/80 bg-purple-400/8',
    mixed_doubles:  'border-amber-400/40 text-amber-400/80 bg-amber-400/8',
}

function getWinnerSide(sets: SetScore[]): 'team1' | 'team2' | 'draw' | null {
    let t1 = 0, t2 = 0, hasInput = false
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
    const getName = (id: string) => userMap.get(id) ?? id
    const getTeamNames = (ids?: string[]) => ids?.length ? ids.map(getName).join(' / ') : '-'
    const getCourtLabel = (courtId: string) => matchGame.courts.find((c) => c.id === courtId)?.label ?? courtId
    const getTimeSlot = (timeSlotId: string) => {
        for (const round of matchGame.rounds) {
            const ts = round.timeSlots.find((t) => t.id === timeSlotId)
            if (ts) return `${ts.startAt} ~ ${ts.endAt}`
        }
        return timeSlotId
    }

    function updateScore(matchId: string, setIndex: number, field: 'team1' | 'team2', value: string) {
        setMatchStates((prev) => {
            const sets = [...prev[matchId].sets]
            sets[setIndex] = { ...sets[setIndex], [field]: value }
            return { ...prev, [matchId]: { ...prev[matchId], sets } }
        })
    }

    function confirmScore(matchId: string) {
        const state = matchStates[matchId]
        const winnerSide = getWinnerSide(state.sets)
        if (winnerSide === null) return
        const sets = state.sets.map((s) => ({ team1: parseInt(s.team1) || 0, team2: parseInt(s.team2) || 0 }))
        setMatchStates((prev) => ({ ...prev, [matchId]: { ...prev[matchId], confirmed: true } }))
        startTransition(async () => { await saveMatchResultAction(clubId, matchGame.id, matchId, sets, winnerSide) })
    }

    function editScore(matchId: string) {
        setMatchStates((prev) => ({ ...prev, [matchId]: { ...prev[matchId], confirmed: false } }))
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
        startTransition(async () => { await confirmMatchGameAction(clubId, matchGame.id) })
    }

    const allConfirmed = matchGame.matches.length > 0 && matchGame.matches.every((m) => matchStates[m.id]?.confirmed)
    const canConfirm = isOwner && allConfirmed && !matchGame.isFixed
    const canEdit = !matchGame.isFixed || isOwner

    return (
        <div className="space-y-3">
            {/* 테이블 래퍼 */}
            <div className="rounded-xl border border-white/8 bg-white/[0.02] overflow-hidden">
                <table className="w-full text-sm">
                    {/* 헤더 */}
                    <thead>
                        <tr className="border-b border-white/8">
                            <th className="px-4 py-3 text-left text-[10px] font-medium tracking-widest uppercase text-white/55 w-12">코트</th>
                            <th className="px-4 py-3 text-left text-[10px] font-medium tracking-widest uppercase text-white/55 w-32">시간</th>
                            <th className="px-4 py-3 text-left text-[10px] font-medium tracking-widest uppercase text-white/55 w-14">종류</th>
                            <th className="px-4 py-3 text-left text-[10px] font-medium tracking-widest uppercase text-white/55">플레이어 1</th>
                            <th className="px-4 py-3 text-left text-[10px] font-medium tracking-widest uppercase text-white/55">플레이어 2</th>
                            <th className="px-4 py-3 text-left text-[10px] font-medium tracking-widest uppercase text-white/55">스코어</th>
                        </tr>
                    </thead>
                    <tbody>
                        {matchGame.matches.map((match, idx) => {
                            const player1 = match.matchType === 'singles' ? getName(match.player1Id ?? '') : getTeamNames(match.team1)
                            const player2 = match.matchType === 'singles' ? getName(match.player2Id ?? '') : getTeamNames(match.team2)
                            const state = matchStates[match.id] ?? { sets: [{ team1: '', team2: '' }], confirmed: false }
                            const winner = state.confirmed ? getWinnerSide(state.sets) : null
                            const isLast = idx === matchGame.matches.length - 1

                            return (
                                <tr
                                    key={match.id}
                                    className={`transition-colors hover:bg-white/[0.025] ${!isLast ? 'border-b border-white/5' : ''}`}
                                >
                                    {/* 코트 */}
                                    <td className="px-4 py-3 font-semibold text-white/90">
                                        {getCourtLabel(match.courtId)}
                                    </td>
                                    {/* 시간 */}
                                    <td className="px-4 py-3 text-xs text-white/60 whitespace-nowrap">
                                        {getTimeSlot(match.timeSlotId)}
                                    </td>
                                    {/* 종류 배지 */}
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border ${MATCH_TYPE_COLORS[match.matchType]}`}>
                                            {MATCH_TYPE_LABELS[match.matchType]}
                                        </span>
                                    </td>
                                    {/* 플레이어 1 */}
                                    <td className="px-4 py-3 max-w-36">
                                        {match.matchType === 'singles' ? (
                                            <span className={`text-sm truncate block transition-colors ${winner === 'team1' ? 'font-bold text-white' : 'text-white/70'}`}>
                                                {player1}
                                            </span>
                                        ) : (
                                            <div className="space-y-1">
                                                {(match.team1 ?? []).map((pid) => {
                                                    const isAd = courtSides[match.id]?.team1 === pid
                                                    return (
                                                        <div key={pid} className="flex items-center gap-1.5">
                                                            <span className={`text-sm truncate max-w-[72px] ${winner === 'team1' ? 'font-bold text-white' : 'text-white/70'}`}>
                                                                {getName(pid)}
                                                            </span>
                                                            {!matchGame.isFixed ? (
                                                                <button
                                                                    onClick={() => toggleAdSide(match.id, 'team1', pid)}
                                                                    disabled={isPending}
                                                                    className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 leading-none transition-colors ${isAd ? 'border-cyan-400/50 text-cyan-400/80 bg-cyan-400/10' : 'border-white/15 text-white/50 hover:border-white/30'}`}
                                                                >
                                                                    {isAd ? '애드' : '듀스'}
                                                                </button>
                                                            ) : (
                                                                <span className="text-[10px] text-white/45 shrink-0">{isAd ? '애드' : '듀스'}</span>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </td>
                                    {/* 플레이어 2 */}
                                    <td className="px-4 py-3 max-w-36">
                                        {match.matchType === 'singles' ? (
                                            <span className={`text-sm truncate block transition-colors ${winner === 'team2' ? 'font-bold text-white' : 'text-white/70'}`}>
                                                {player2}
                                            </span>
                                        ) : (
                                            <div className="space-y-1">
                                                {(match.team2 ?? []).map((pid) => {
                                                    const isAd = courtSides[match.id]?.team2 === pid
                                                    return (
                                                        <div key={pid} className="flex items-center gap-1.5">
                                                            <span className={`text-sm truncate max-w-[72px] ${winner === 'team2' ? 'font-bold text-white' : 'text-white/70'}`}>
                                                                {getName(pid)}
                                                            </span>
                                                            {!matchGame.isFixed ? (
                                                                <button
                                                                    onClick={() => toggleAdSide(match.id, 'team2', pid)}
                                                                    disabled={isPending}
                                                                    className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 leading-none transition-colors ${isAd ? 'border-cyan-400/50 text-cyan-400/80 bg-cyan-400/10' : 'border-white/15 text-white/50 hover:border-white/30'}`}
                                                                >
                                                                    {isAd ? '애드' : '듀스'}
                                                                </button>
                                                            ) : (
                                                                <span className="text-[10px] text-white/45 shrink-0">{isAd ? '애드' : '듀스'}</span>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </td>
                                    {/* 스코어 */}
                                    <td className="px-4 py-3">
                                        {state.confirmed ? (
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1.5 font-mono text-sm">
                                                    <span className={winner === 'team1' ? 'font-black text-white' : 'text-white/55'}>
                                                        {state.sets[0].team1}
                                                    </span>
                                                    <span className="text-white/45">:</span>
                                                    <span className={winner === 'team2' ? 'font-black text-white' : 'text-white/55'}>
                                                        {state.sets[0].team2}
                                                    </span>
                                                </div>
                                                {canEdit && (
                                                    <button
                                                        className="w-6 h-6 flex items-center justify-center rounded text-white/50 hover:text-white/80 hover:bg-white/8 transition-colors"
                                                        onClick={() => editScore(match.id)}
                                                        disabled={isPending}
                                                    >
                                                        <Pencil className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5">
                                                <input
                                                    type="text"
                                                    value={state.sets[0].team1}
                                                    onChange={(e) => updateScore(match.id, 0, 'team1', e.target.value)}
                                                    className="h-7 w-10 text-center text-xs rounded-md bg-white/5 border border-white/12 text-white placeholder:text-white/20 outline-none focus:border-white/30 transition-colors"
                                                    placeholder="P1"
                                                />
                                                <span className="text-white/25 text-xs">:</span>
                                                <input
                                                    type="text"
                                                    value={state.sets[0].team2}
                                                    onChange={(e) => updateScore(match.id, 0, 'team2', e.target.value)}
                                                    className="h-7 w-10 text-center text-xs rounded-md bg-white/5 border border-white/12 text-white placeholder:text-white/20 outline-none focus:border-white/30 transition-colors"
                                                    placeholder="P2"
                                                />
                                                <button
                                                    className="w-7 h-7 flex items-center justify-center rounded-md border border-cyan-400/30 text-cyan-400/70 hover:bg-cyan-400/10 hover:border-cyan-400/50 transition-colors disabled:opacity-40"
                                                    onClick={() => confirmScore(match.id)}
                                                    disabled={isPending}
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* 결과 확정 버튼 */}
            {canConfirm && (
                <div className="flex justify-end">
                    <Button
                        size="sm"
                        onClick={handleConfirmMatchGame}
                        disabled={isPending}
                        className="gap-1.5 rounded-full bg-white text-black hover:bg-white/90 font-semibold px-5"
                    >
                        <Trophy className="w-3.5 h-3.5" />
                        결과 확정
                    </Button>
                </div>
            )}
        </div>
    )
}

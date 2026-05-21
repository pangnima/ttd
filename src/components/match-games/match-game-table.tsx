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

// 세트 카운트 다수결로 승자 결정.
// 반환값: null = 아직 아무 점수도 입력되지 않음, 'draw' = 세트 수 동률.
// NaN(빈 입력)은 0으로 처리하되, 양쪽 모두 NaN이면 미입력으로 판단.
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

type MatchCardItemProps = {
    match: MatchGame['matches'][number]
    matchGame: MatchGame
    state: MatchState
    winner: 'team1' | 'team2' | 'draw' | null
    courtSides: CourtSideState
    isPending: boolean
    canEdit: boolean
    getName: (id: string) => string
    getCourtLabel: (courtId: string) => string
    toggleAdSide: (matchId: string, teamKey: 'team1' | 'team2', playerId: string) => void
    updateScore: (matchId: string, setIndex: number, field: 'team1' | 'team2', value: string) => void
    confirmScore: (matchId: string) => void
    editScore: (matchId: string) => void
}

function MatchCardItem({
    match, matchGame, state, winner, courtSides, isPending, canEdit,
    getName, getCourtLabel,
    toggleAdSide, updateScore, confirmScore, editScore,
}: MatchCardItemProps) {
    const renderPlayerList = (playerIds: string[] | undefined, teamKey: 'team1' | 'team2', winnerSide: 'team1' | 'team2' | 'draw' | null) => {
        if (!playerIds?.length) return <span className="text-foreground/55 text-xs">-</span>
        return (
            <div className="space-y-1">
                {playerIds.map((pid) => {
                    const isAd = courtSides[match.id]?.[teamKey] === pid
                    return (
                        <div key={pid} className="flex items-center justify-between gap-2">
                            <span className={`text-sm flex-1 min-w-0 ${winnerSide === teamKey ? 'font-bold text-foreground' : 'text-foreground/85'}`}>
                                {getName(pid)}
                            </span>
                            {!matchGame.isFixed ? (
                                <button
                                    onClick={() => toggleAdSide(match.id, teamKey, pid)}
                                    disabled={isPending}
                                    className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 leading-none transition-colors ${isAd ? 'border-cyan-400/50 text-cyan-400/80 bg-cyan-400/10' : 'border-foreground/20 text-foreground/65 hover:border-foreground/35'}`}
                                >
                                    {isAd ? '애드(백)' : '듀스(포)'}
                                </button>
                            ) : (
                                <span className="text-[10px] text-foreground/60 shrink-0">{isAd ? '애드(백)' : '듀스(포)'}</span>
                            )}
                        </div>
                    )
                })}
            </div>
        )
    }

    return (
        <div className="rounded-xl border border-foreground/8 bg-foreground/[0.02] p-4 space-y-3">
            {/* 상단: 코트·시간·종류 */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-sm text-foreground shrink-0">
                        {getCourtLabel(match.courtId)}
                    </span>
                </div>
                <span className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border shrink-0 ${MATCH_TYPE_COLORS[match.matchType]}`}>
                    {MATCH_TYPE_LABELS[match.matchType]}
                </span>
            </div>

            {/* 플레이어 */}
            <div className="space-y-2">
                {match.matchType === 'singles' ? (
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-foreground/55 shrink-0">P1</span>
                        <span className={`text-sm flex-1 ${winner === 'team1' ? 'font-bold text-foreground' : 'text-foreground/85'}`}>
                            {getName(match.player1Id ?? '')}
                        </span>
                        <span className="text-foreground/35 text-xs mx-1">vs</span>
                        <span className={`text-sm flex-1 text-right ${winner === 'team2' ? 'font-bold text-foreground' : 'text-foreground/85'}`}>
                            {getName(match.player2Id ?? '')}
                        </span>
                        <span className="text-xs text-foreground/55 shrink-0">P2</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-[10px] text-foreground/55 mb-1 uppercase tracking-wider">플레이어 1</p>
                            {renderPlayerList(match.team1, 'team1', winner)}
                        </div>
                        <div>
                            <p className="text-[10px] text-foreground/55 mb-1 uppercase tracking-wider">플레이어 2</p>
                            {renderPlayerList(match.team2, 'team2', winner)}
                        </div>
                    </div>
                )}
            </div>

            {/* 스코어 */}
            <div className="pt-1 border-t border-foreground/8">
                {state.confirmed ? (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-mono text-sm">
                            <span className={winner === 'team1' ? 'font-black text-foreground' : 'text-foreground/70'}>
                                {state.sets[0].team1}
                            </span>
                            <span className="text-foreground/55">:</span>
                            <span className={winner === 'team2' ? 'font-black text-foreground' : 'text-foreground/70'}>
                                {state.sets[0].team2}
                            </span>
                        </div>
                        {canEdit && (
                            <button
                                className="w-7 h-7 flex items-center justify-center rounded text-foreground/60 hover:text-foreground/85 hover:bg-foreground/8 transition-colors"
                                onClick={() => editScore(match.id)}
                                disabled={isPending}
                            >
                                <Pencil className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={state.sets[0].team1}
                            onChange={(e) => updateScore(match.id, 0, 'team1', e.target.value)}
                            className="h-8 w-12 text-center text-xs rounded-md bg-foreground/5 border border-foreground/15 text-foreground placeholder:text-foreground/30 outline-none focus:border-foreground/35 transition-colors"
                            placeholder="P1"
                        />
                        <span className="text-foreground/35 text-xs">:</span>
                        <input
                            type="text"
                            value={state.sets[0].team2}
                            onChange={(e) => updateScore(match.id, 0, 'team2', e.target.value)}
                            className="h-8 w-12 text-center text-xs rounded-md bg-foreground/5 border border-foreground/15 text-foreground placeholder:text-foreground/30 outline-none focus:border-foreground/35 transition-colors"
                            placeholder="P2"
                        />
                        <button
                            className="h-8 px-3 flex items-center justify-center rounded-md border border-cyan-400/30 text-cyan-400/70 hover:bg-cyan-400/10 hover:border-cyan-400/50 transition-colors disabled:opacity-40"
                            onClick={() => confirmScore(match.id)}
                            disabled={isPending}
                        >
                            <Check className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
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
    // courtSides: 각 경기에서 team1/team2 중 애드코트(백핸드/레프트 사이드)를 맡은 선수 ID.
    // DB의 team1AdPlayerId / team2AdPlayerId 단일 값으로 관리 — null이면 미지정(= 듀스코트 기본).
    // 단식 경기에서는 이 state가 사용되지 않음.
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
    const getCourtLabel = (courtId: string) => matchGame.courts.find((c) => c.id === courtId)?.label ?? courtId
    const getTimeSlot = (timeSlotId: string) => {
        for (const round of matchGame.rounds) {
            const ts = round.timeSlots.find((t) => t.id === timeSlotId)
            if (ts) return `${ts.startAt} ~ ${ts.endAt}`
        }
        return timeSlotId
    }

    // 시간대별 그룹 — matchGame.matches는 이미 order 정렬됨. timeSlotId로 묶고 시작 시각순 정렬.
    const slotGroups = (() => {
        const map = new Map<string, typeof matchGame.matches>()
        for (const m of matchGame.matches) {
            const arr = map.get(m.timeSlotId) ?? []
            arr.push(m)
            map.set(m.timeSlotId, arr)
        }
        return [...map.entries()]
            .map(([slotId, matches]) => ({ slotId, label: getTimeSlot(slotId), matches }))
            .sort((a, b) => a.label.localeCompare(b.label))
    })()

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

    // 테니스 코트 배치 토글:
    //   듀스코트 = 포핸드 사이드 (라이트) — 기본값, 버튼 라벨: '듀스(포)'
    //   애드코트 = 백핸드 사이드 (레프트) — 선택 시, 버튼 라벨: '애드(백)'
    // 같은 팀에서 한 명만 애드코트를 차지할 수 있으므로 단일 ID로 토글
    // (이미 선택된 선수를 다시 클릭하면 null로 해제)
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
            {/* 데스크탑 테이블 (md 이상) */}
            <div className="hidden md:block rounded-xl border border-foreground/8 bg-foreground/[0.02] overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-foreground/8">
                            <th className="px-3 py-3 text-left text-[10px] font-medium tracking-widest uppercase text-foreground/65 whitespace-nowrap w-16">코트</th>
                            <th className="px-3 py-3 text-left text-[10px] font-medium tracking-widest uppercase text-foreground/65 whitespace-nowrap w-16">종류</th>
                            <th className="px-3 py-3 text-left text-[10px] font-medium tracking-widest uppercase text-foreground/65">플레이어 1</th>
                            <th className="px-3 py-3 text-left text-[10px] font-medium tracking-widest uppercase text-foreground/65">플레이어 2</th>
                            <th className="px-3 py-3 text-left text-[10px] font-medium tracking-widest uppercase text-foreground/65">스코어</th>
                        </tr>
                    </thead>
                    <tbody>
                        {slotGroups.flatMap((group) => [
                            <tr key={`header-${group.slotId}`} className="bg-foreground/[0.03] border-y border-foreground/8">
                                <td colSpan={5} className="px-3 py-2 text-xs font-semibold text-foreground/80">
                                    {group.label}
                                </td>
                            </tr>,
                            ...group.matches.map((match, idx) => {
                                const state = matchStates[match.id] ?? { sets: [{ team1: '', team2: '' }], confirmed: false }
                                const winner = state.confirmed ? getWinnerSide(state.sets) : null
                                const isLastInGroup = idx === group.matches.length - 1
                                return (
                                    <tr
                                        key={match.id}
                                        className={`transition-colors hover:bg-foreground/[0.025] ${!isLastInGroup ? 'border-b border-foreground/5' : ''}`}
                                    >
                                        {/* 코트 */}
                                        <td className="px-3 py-3 font-semibold text-foreground">
                                            {getCourtLabel(match.courtId)}
                                        </td>
                                        {/* 종류 배지 */}
                                        <td className="px-3 py-3">
                                            <span className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border ${MATCH_TYPE_COLORS[match.matchType]}`}>
                                                {MATCH_TYPE_LABELS[match.matchType]}
                                            </span>
                                        </td>
                                        {/* 플레이어 1 */}
                                        <td className="px-3 py-3">
                                            {match.matchType === 'singles' ? (
                                                <span className={`text-sm transition-colors ${winner === 'team1' ? 'font-bold text-foreground' : 'text-foreground/85'}`}>
                                                    {getName(match.player1Id ?? '')}
                                                </span>
                                            ) : (
                                                <div className="space-y-1">
                                                    {(match.team1 ?? []).map((pid) => {
                                                        const isAd = courtSides[match.id]?.team1 === pid
                                                        return (
                                                            <div key={pid} className="flex items-center gap-1.5">
                                                                <span className={`text-sm ${winner === 'team1' ? 'font-bold text-foreground' : 'text-foreground/85'}`}>
                                                                    {getName(pid)}
                                                                </span>
                                                                {!matchGame.isFixed ? (
                                                                    <button
                                                                        onClick={() => toggleAdSide(match.id, 'team1', pid)}
                                                                        disabled={isPending}
                                                                        className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 leading-none transition-colors ${isAd ? 'border-cyan-400/50 text-cyan-400/80 bg-cyan-400/10' : 'border-foreground/20 text-foreground/65 hover:border-foreground/35'}`}
                                                                    >
                                                                        {isAd ? '애드(백)' : '듀스(포)'}
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-[10px] text-foreground/60 shrink-0">{isAd ? '애드(백)' : '듀스(포)'}</span>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </td>
                                        {/* 플레이어 2 */}
                                        <td className="px-3 py-3">
                                            {match.matchType === 'singles' ? (
                                                <span className={`text-sm transition-colors ${winner === 'team2' ? 'font-bold text-foreground' : 'text-foreground/85'}`}>
                                                    {getName(match.player2Id ?? '')}
                                                </span>
                                            ) : (
                                                <div className="space-y-1">
                                                    {(match.team2 ?? []).map((pid) => {
                                                        const isAd = courtSides[match.id]?.team2 === pid
                                                        return (
                                                            <div key={pid} className="flex items-center gap-1.5">
                                                                <span className={`text-sm ${winner === 'team2' ? 'font-bold text-foreground' : 'text-foreground/85'}`}>
                                                                    {getName(pid)}
                                                                </span>
                                                                {!matchGame.isFixed ? (
                                                                    <button
                                                                        onClick={() => toggleAdSide(match.id, 'team2', pid)}
                                                                        disabled={isPending}
                                                                        className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 leading-none transition-colors ${isAd ? 'border-cyan-400/50 text-cyan-400/80 bg-cyan-400/10' : 'border-foreground/20 text-foreground/65 hover:border-foreground/35'}`}
                                                                    >
                                                                        {isAd ? '애드(백)' : '듀스(포)'}
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-[10px] text-foreground/60 shrink-0">{isAd ? '애드(백)' : '듀스(포)'}</span>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </td>
                                        {/* 스코어 */}
                                        <td className="px-3 py-3">
                                            {state.confirmed ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-1.5 font-mono text-sm">
                                                        <span className={winner === 'team1' ? 'font-black text-foreground' : 'text-foreground/70'}>
                                                            {state.sets[0].team1}
                                                        </span>
                                                        <span className="text-foreground/55">:</span>
                                                        <span className={winner === 'team2' ? 'font-black text-foreground' : 'text-foreground/70'}>
                                                            {state.sets[0].team2}
                                                        </span>
                                                    </div>
                                                    {canEdit && (
                                                        <button
                                                            className="w-6 h-6 flex items-center justify-center rounded text-foreground/60 hover:text-foreground/85 hover:bg-foreground/8 transition-colors"
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
                                                        className="h-7 w-10 text-center text-xs rounded-md bg-foreground/5 border border-foreground/15 text-foreground placeholder:text-foreground/30 outline-none focus:border-foreground/35 transition-colors"
                                                        placeholder="P1"
                                                    />
                                                    <span className="text-foreground/35 text-xs">:</span>
                                                    <input
                                                        type="text"
                                                        value={state.sets[0].team2}
                                                        onChange={(e) => updateScore(match.id, 0, 'team2', e.target.value)}
                                                        className="h-7 w-10 text-center text-xs rounded-md bg-foreground/5 border border-foreground/15 text-foreground placeholder:text-foreground/30 outline-none focus:border-foreground/35 transition-colors"
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
                            }),
                        ])}
                    </tbody>
                </table>
            </div>

            {/* 모바일 카드 리스트 (md 미만) */}
            <div className="md:hidden space-y-3">
                {slotGroups.map((group) => (
                    <div key={group.slotId}>
                        <p className="text-xs font-semibold text-foreground/80 pb-2">{group.label}</p>
                        <div className="space-y-2">
                            {group.matches.map((match) => {
                                const state = matchStates[match.id] ?? { sets: [{ team1: '', team2: '' }], confirmed: false }
                                const winner = state.confirmed ? getWinnerSide(state.sets) : null
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
                                    />
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* 결과 확정 버튼 */}
            {canConfirm && (
                <div className="flex justify-end">
                    <Button
                        size="sm"
                        onClick={handleConfirmMatchGame}
                        disabled={isPending}
                        className="gap-1.5 rounded-full bg-white text-black hover:bg-foreground/90 font-semibold px-5"
                    >
                        <Trophy className="w-3.5 h-3.5" />
                        결과 확정
                    </Button>
                </div>
            )}
        </div>
    )
}

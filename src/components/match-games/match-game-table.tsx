'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Trophy } from 'lucide-react'
import { saveMatchResultAction, confirmMatchGameAction, saveCourtSidesAction } from '@/lib/actions/match-games'
import { MATCH_TYPE_LABELS, getMatchTypeBadgeClass } from '@/lib/dashboard/match-type-style'
import { TeamPlayersCell, ScoreCell, type SetScore } from '@/components/match-games/match-game-cell-components'
import { AttendanceSummary } from '@/components/match-games/attendance-summary'
import { matchPlayerIds, restingIdsBySlot, gameCountsByPlayer } from '@/lib/match-games/attendance-stats'
import { sortByGender } from '@/lib/match-games/form-mapping'
import type { MatchGame, User } from '@/types'

type MatchState = { sets: SetScore[]; confirmed: boolean }
type MatchStates = Record<string, MatchState>
type CourtSideState = Record<string, { team1: string | null; team2: string | null }>

type MatchGameTableProps = {
    matchGame: MatchGame
    members: User[]
    clubId: string
    isOwner?: boolean
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
    getName, getCourtLabel, toggleAdSide, updateScore, confirmScore, editScore,
}: MatchCardItemProps) {
    const sides = courtSides[match.id]
    return (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
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
                        <span className={`text-sm flex-1 ${winner === 'team1' ? 'font-bold text-foreground' : 'text-foreground'}`}>
                            {getName(match.player1Id ?? '')}
                        </span>
                        <span className="text-muted-foreground text-xs mx-1">vs</span>
                        <span className={`text-sm flex-1 text-right ${winner === 'team2' ? 'font-bold text-foreground' : 'text-foreground'}`}>
                            {getName(match.player2Id ?? '')}
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
                                isPending={isPending}
                                getName={getName}
                                onToggle={(teamKey, pid) => toggleAdSide(match.id, teamKey, pid)}
                                justify
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
                                isPending={isPending}
                                getName={getName}
                                onToggle={(teamKey, pid) => toggleAdSide(match.id, teamKey, pid)}
                                justify
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

    // 전체 참석자 = 모든 경기에 등장한 선수의 합집합 (참석자 명단은 DB에 저장되지 않으므로 근사).
    const allAttendeeIds = [...new Set(matchGame.matches.flatMap(matchPlayerIds))]
    // 시간대별 휴식 인원 — 각 시간대에서 어느 경기에도 배정되지 않은 참석자.
    const restMap = restingIdsBySlot(
        slotGroups.map((g) => ({ key: g.slotId, playerIds: g.matches.flatMap(matchPlayerIds) })),
        allAttendeeIds
    )
    const restNames = (slotId: string): string[] => {
        const users = (restMap.get(slotId) ?? [])
            .map((id) => members.find((m) => m.id === id))
            .filter((u): u is User => Boolean(u))
        return sortByGender(users).map((u) => u.nickname)
    }
    // 인원별 총 게임수
    const gameCounts = gameCountsByPlayer(matchGame.matches.map(matchPlayerIds), members).map(
        ({ player, count }) => ({ id: player.id, name: player.nickname, count })
    )

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
    //   듀스코트 = 포핸드 사이드 (라이트) — 기본값
    //   애드코트 = 백핸드 사이드 (레프트) — 선택 시
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

    const allConfirmed = matchGame.matches.length > 0 && matchGame.matches.every((m) => matchStates[m.id]?.confirmed)
    const canConfirm = isOwner && allConfirmed && !matchGame.isFixed
    const canEdit = !matchGame.isFixed || isOwner

    return (
        <div className="space-y-3">
            {/* 데스크탑 테이블 (md 이상) */}
            <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="px-3 py-3 text-left text-[10px] font-medium tracking-widest uppercase text-muted-foreground whitespace-nowrap w-16">코트</th>
                            <th className="px-3 py-3 text-left text-[10px] font-medium tracking-widest uppercase text-muted-foreground whitespace-nowrap w-16">종류</th>
                            <th className="px-3 py-3 text-left text-[10px] font-medium tracking-widest uppercase text-muted-foreground">플레이어 1</th>
                            <th className="px-3 py-3 text-left text-[10px] font-medium tracking-widest uppercase text-muted-foreground">플레이어 2</th>
                            <th className="px-3 py-3 text-left text-[10px] font-medium tracking-widest uppercase text-muted-foreground">스코어</th>
                        </tr>
                    </thead>
                    <tbody>
                        {slotGroups.flatMap((group) => [
                            <tr key={`header-${group.slotId}`} className="bg-muted/30 border-y border-border">
                                <td colSpan={5} className="px-3 py-2 text-xs font-semibold text-foreground">
                                    <div className="flex items-center justify-between gap-3">
                                        <span>{group.label}</span>
                                        {restNames(group.slotId).length > 0 && (
                                            <span className="font-normal text-muted-foreground">
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
                                return (
                                    <tr
                                        key={match.id}
                                        className={`transition-colors hover:bg-muted/30 ${!isLastInGroup ? 'border-b border-border' : ''}`}
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
                                                <span className={`text-sm transition-colors ${winner === 'team1' ? 'font-bold text-foreground' : 'text-foreground'}`}>
                                                    {getName(match.player1Id ?? '')}
                                                </span>
                                            ) : (
                                                <TeamPlayersCell
                                                    playerIds={match.team1 ?? []}
                                                    teamKey="team1"
                                                    winner={winner}
                                                    isFixed={matchGame.isFixed}
                                                    adPlayerId={sides?.team1 ?? null}
                                                    isPending={isPending}
                                                    getName={getName}
                                                    onToggle={(teamKey, pid) => toggleAdSide(match.id, teamKey, pid)}
                                                />
                                            )}
                                        </td>
                                        <td className="px-3 py-3">
                                            {match.matchType === 'singles' ? (
                                                <span className={`text-sm transition-colors ${winner === 'team2' ? 'font-bold text-foreground' : 'text-foreground'}`}>
                                                    {getName(match.player2Id ?? '')}
                                                </span>
                                            ) : (
                                                <TeamPlayersCell
                                                    playerIds={match.team2 ?? []}
                                                    teamKey="team2"
                                                    winner={winner}
                                                    isFixed={matchGame.isFixed}
                                                    adPlayerId={sides?.team2 ?? null}
                                                    isPending={isPending}
                                                    getName={getName}
                                                    onToggle={(teamKey, pid) => toggleAdSide(match.id, teamKey, pid)}
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
                            <p className="text-xs font-semibold text-foreground">{group.label}</p>
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

            {gameCounts.length > 0 && <AttendanceSummary gameCounts={gameCounts} />}

            {canConfirm && (
                <div className="flex justify-end">
                    <Button
                        size="sm"
                        onClick={() => startTransition(async () => { await confirmMatchGameAction(clubId, matchGame.id) })}
                        disabled={isPending}
                        className="gap-1.5 rounded-full font-semibold px-5"
                    >
                        <Trophy className="w-3.5 h-3.5" />
                        결과 확정
                    </Button>
                </div>
            )}
        </div>
    )
}

'use client'

import { useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { saveMatchResultAction, confirmMatchGameAction, saveCourtSidesAction } from '@/lib/actions/match-games'
import { AttendanceSummary } from '@/components/match-games/attendance-summary'
import { MatchConfirmFooter } from '@/components/match-games/match-confirm-footer'
import { MatchListView } from '@/components/match-games/match-list-view'
import { MatchGridView } from '@/components/match-games/match-grid-view'
import { MatchViewToggle, readViewMode } from '@/components/match-games/match-view-toggle'
import { matchPlayerIds, restingIdsBySlot, gameCountsByPlayer } from '@/lib/match-games/attendance-stats'
import { sortByGender } from '@/lib/match-games/form-mapping'
import {
    buildSlotGroups, getWinnerSide,
    type MatchStates, type CourtSideState, type MatchViewProps,
} from '@/lib/match-games/match-view-helpers'
import type { RatingChange } from '@/lib/queries/ratings'
import type { MatchGame, User } from '@/types'

type MatchGameTableProps = {
    matchGame: MatchGame
    members: User[]
    clubId: string
    isOwner?: boolean
    // 확정 경기별·선수별 클럽 레이팅 변동. matchId → (userId → {before, after}).
    ratingDeltaByMatch?: Record<string, Record<string, RatingChange>>
    // 현재 로그인 사용자 id — 본인이 참가한 경기를 강조하는 데 사용.
    currentUserId?: string
}

// 대진표 렌더링의 상태 컨테이너. 점수/코트배치 state와 핸들러를 소유하고,
// viewMode(URL ?view=)에 따라 리스트/매트릭스 프레젠테이션 컴포넌트로 분기한다.
// 두 뷰가 동일한 핸들러를 공유하므로 토글해도 입력값이 보존된다.
export function MatchGameTable({ matchGame, members, clubId, isOwner = false, ratingDeltaByMatch, currentUserId }: MatchGameTableProps) {
    const searchParams = useSearchParams()
    const viewMode = readViewMode(searchParams.get('view'))

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

    // 시간대별 그룹 — 휴식 인원 계산용. (리스트/매트릭스 각 뷰는 내부에서 자체 재계산)
    const slotGroups = buildSlotGroups(matchGame)
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
        // 낙관적 업데이트: 클라이언트 state를 즉시 반영해 버튼이 곧바로 반응하게 한다.
        setCourtSides((prev) => ({ ...prev, [matchId]: nextSides }))
        // 저장은 fire-and-forget (공유 transition 미사용 → 다른 입력/버튼을 잠그지 않음).
        // 실패 시에만 이전 값으로 롤백한다.
        void saveCourtSidesAction(clubId, matchGame.id, matchId, nextSides.team1, nextSides.team2).then(
            (res) => {
                if (!res.ok) setCourtSides((prev) => ({ ...prev, [matchId]: current }))
            }
        )
    }

    const canEdit = !matchGame.isFixed || isOwner

    // 두 뷰에 동일하게 내려주는 공유 props.
    const sharedProps: MatchViewProps = {
        matchGame, matchStates, courtSides, isPending, canEdit, currentUserId,
        ratingDeltaByMatch, getName, getCourtLabel, restNames,
        updateScore, confirmScore, editScore, toggleAdSide,
    }

    return (
        <div className="space-y-3">
            <div className="flex justify-end">
                <MatchViewToggle mode={viewMode} />
            </div>

            {viewMode === 'grid'
                ? <MatchGridView {...sharedProps} />
                : <MatchListView {...sharedProps} />}

            {gameCounts.length > 0 && <AttendanceSummary gameCounts={gameCounts} />}

            <MatchConfirmFooter
                matchGame={matchGame}
                matchStates={matchStates}
                isOwner={isOwner}
                isPending={isPending}
                getCourtLabel={getCourtLabel}
                onConfirm={() => startTransition(async () => { await confirmMatchGameAction(clubId, matchGame.id) })}
            />
        </div>
    )
}

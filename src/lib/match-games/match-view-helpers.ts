import type { MatchGame, Match } from '@/types'
import type { SetScore } from '@/components/match-games/match-game-cell-components'

// ── 공유 타입 ────────────────────────────────

// 승자 사이드. null = 아직 아무 점수도 입력되지 않음.
export type WinnerSide = 'team1' | 'team2' | 'draw' | null

export type MatchState = { sets: SetScore[]; confirmed: boolean }
export type MatchStates = Record<string, MatchState>
// 각 경기에서 team1/team2 중 애드코트(백핸드/레프트)를 맡은 선수 ID. null이면 미지정(듀스 기본).
export type CourtSideState = Record<string, { team1: string | null; team2: string | null }>

// 시간대별 그룹 (리스트 뷰 행 구성 + 휴식 인원 계산 공용)
export type SlotGroup = { slotId: string; label: string; matches: Match[] }

// 리스트/매트릭스 두 뷰가 공유하는 props 묶음.
// 모든 핸들러가 matchId 기반이라 어느 뷰에서 호출해도 같은 컨테이너 state를 갱신한다.
export type MatchViewProps = {
    matchGame: MatchGame
    matchStates: MatchStates
    courtSides: CourtSideState
    isPending: boolean
    canEdit: boolean
    currentUserId?: string
    // 확정 경기별·선수별 클럽 레이팅 변동. matchId → (userId → delta).
    ratingDeltaByMatch?: Record<string, Record<string, number>>
    getName: (id: string) => string
    getCourtLabel: (courtId: string) => string
    restNames: (slotId: string) => string[]
    updateScore: (matchId: string, setIndex: number, field: 'team1' | 'team2', value: string) => void
    confirmScore: (matchId: string) => void
    editScore: (matchId: string) => void
    toggleAdSide: (matchId: string, teamKey: 'team1' | 'team2', playerId: string) => void
}

// ── 공유 스타일 상수 ────────────────────────────────
// 시간 텍스트 = info(블루 데이터) / "내 경기" 강조 = accent-lime(시그니처)
export const SLOT_TIME_CLASS = 'text-info'
export const SELF_ROW_CLASS = 'bg-accent-lime/10 border-l-4 border-l-accent-lime'
export const SELF_CARD_CLASS = 'border-accent-lime/50 bg-accent-lime/10'

// ── 순수 함수 ────────────────────────────────

// 세트 카운트 다수결로 승자 결정.
// 반환값: null = 아직 아무 점수도 입력되지 않음, 'draw' = 세트 수 동률.
// NaN(빈 입력)은 0으로 처리하되, 양쪽 모두 NaN이면 미입력으로 판단.
export function getWinnerSide(sets: SetScore[]): WinnerSide {
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

// timeSlotId → "08:05 ~ 08:30" 라벨. 매칭 실패 시 id를 그대로 반환.
export function formatTimeSlotLabel(matchGame: MatchGame, timeSlotId: string): string {
    for (const round of matchGame.rounds) {
        const ts = round.timeSlots.find((t) => t.id === timeSlotId)
        if (ts) return `${ts.startAt} ~ ${ts.endAt}`
    }
    return timeSlotId
}

// 시간대별 그룹 — matchGame.matches는 이미 order 정렬됨. timeSlotId로 묶고 시작 시각순(label) 정렬.
export function buildSlotGroups(matchGame: MatchGame): SlotGroup[] {
    const map = new Map<string, Match[]>()
    for (const m of matchGame.matches) {
        const arr = map.get(m.timeSlotId) ?? []
        arr.push(m)
        map.set(m.timeSlotId, arr)
    }
    return [...map.entries()]
        .map(([slotId, matches]) => ({ slotId, label: formatTimeSlotLabel(matchGame, slotId), matches }))
        .sort((a, b) => a.label.localeCompare(b.label))
}

// 매트릭스 Y축: 실제 경기가 있는 timeSlot만, buildSlotGroups와 동일한 label 정렬로 리스트와 행 순서 일치.
export function flattenTimeSlots(matchGame: MatchGame): Array<{ slotId: string; label: string }> {
    return buildSlotGroups(matchGame).map(({ slotId, label }) => ({ slotId, label }))
}

// 매트릭스 셀 키 — `1코트 × 1타임슬롯 = 1경기` 도메인 규칙으로 단일값 매핑.
export function matchMatrixKey(courtId: string, slotId: string): string {
    return `${courtId}__${slotId}`
}

// (courtId__slotId) → Match 매핑.
export function buildMatchMatrix(matches: Match[]): Map<string, Match> {
    const map = new Map<string, Match>()
    for (const m of matches) {
        map.set(matchMatrixKey(m.courtId, m.timeSlotId), m)
    }
    return map
}

import type { Match } from '@/types'
import {
    DEFAULT_RATING,
    K_BASE,
    K_PROVISIONAL,
    MARGIN_WEIGHT,
    MAX_RATING,
    MIN_RATING,
    PROVISIONAL_THRESHOLD,
    RATING_SCALE_D,
} from './constants'

// ── 타입 ────────────────────────────────────────────────

export type RatingState = {
    rating: number
    matchesPlayed: number
}

export type RatingHistoryEntry = {
    matchId: string
    userId: string
    ratingBefore: number
    ratingAfter: number
    delta: number
}

export type ClubRatingSnapshot = {
    /** userId → 최종 레이팅/경기 수 (게스트 포함) */
    ratings: Map<string, RatingState>
    /** 경기 적용 순서대로 누적된 변동 이력 */
    history: RatingHistoryEntry[]
}

type WinnerSide = 'team1' | 'team2' | 'draw'
type SetScore = { team1: number; team2: number }

// ── 순수 계산 함수 ──────────────────────────────────────

/** rSelf 입장에서 rOpp 상대로의 기대 승률 (ELO). */
export function expectedScore(rSelf: number, rOpp: number): number {
    return 1 / (1 + Math.pow(10, (rOpp - rSelf) / RATING_SCALE_D))
}

/** 경기 수에 따른 K 계수 (잠정기 차등). */
export function pickK(matchesPlayed: number): number {
    return matchesPlayed < PROVISIONAL_THRESHOLD ? K_PROVISIONAL : K_BASE
}

/**
 * 세트 게임 차로 변동폭을 가중한다.
 * dominance = clamp((Gw − Gl) / (Gw + Gl), 0, 1), factor = 1 + MARGIN_WEIGHT × dominance.
 * 무승부·스코어 없음 → 1.0.
 */
export function marginFactor(sets: SetScore[], winnerId: WinnerSide): number {
    if (winnerId === 'draw' || sets.length === 0) return 1
    let team1Games = 0
    let team2Games = 0
    for (const s of sets) {
        team1Games += s.team1
        team2Games += s.team2
    }
    const gw = winnerId === 'team1' ? team1Games : team2Games
    const gl = winnerId === 'team1' ? team2Games : team1Games
    const total = gw + gl
    if (total === 0) return 1
    const dominance = Math.min(Math.max((gw - gl) / total, 0), 1)
    return 1 + MARGIN_WEIGHT * dominance
}

/** 단일 선수(또는 팀)의 변동량. delta = K × marginFactor × (S − E). */
export function computeMatchDelta(params: {
    selfRating: number
    oppRating: number
    selfScore: number // 승 1 / 패 0 / 무 0.5
    k: number
    margin: number
}): number {
    const e = expectedScore(params.selfRating, params.oppRating)
    return params.k * params.margin * (params.selfScore - e)
}

function clampRating(r: number): number {
    return Math.min(Math.max(r, MIN_RATING), MAX_RATING)
}

function getTeams(m: Match): { team1: string[]; team2: string[] } {
    if (m.matchType === 'singles') {
        return {
            team1: m.player1Id ? [m.player1Id] : [],
            team2: m.player2Id ? [m.player2Id] : [],
        }
    }
    return { team1: m.team1 ?? [], team2: m.team2 ?? [] }
}

function sideScore(side: 'team1' | 'team2', winnerId: WinnerSide): number {
    if (winnerId === 'draw') return 0.5
    return winnerId === side ? 1 : 0
}

// ── 전체 재계산 (Full Recompute) ────────────────────────

/**
 * 정렬된 확정 경기 배열을 순차 재생(replay)해 클럽 전체 레이팅을 산출한다.
 * 결정적·멱등: 동일 입력 → 동일 스냅샷. DB 접근 없음.
 *
 * @param matches docs/rating-system.md §2.7 정렬키로 미리 정렬된 확정 경기들.
 *                각 경기에 result(sets, winnerId)가 있어야 반영된다.
 */
export function replayClubRatings(matches: Match[]): ClubRatingSnapshot {
    const ratings = new Map<string, RatingState>()
    const history: RatingHistoryEntry[] = []

    const ensure = (id: string): RatingState => {
        let state = ratings.get(id)
        if (!state) {
            state = { rating: DEFAULT_RATING, matchesPlayed: 0 }
            ratings.set(id, state)
        }
        return state
    }

    const teamAverage = (ids: string[]): number => {
        const sum = ids.reduce((acc, id) => acc + ensure(id).rating, 0)
        return sum / ids.length
    }

    for (const m of matches) {
        if (!m.result) continue
        const { team1, team2 } = getTeams(m)
        if (team1.length === 0 || team2.length === 0) continue

        // 변동량은 모두 '경기 전' 상태로 계산한다.
        const r1 = teamAverage(team1)
        const r2 = teamAverage(team2)
        const e1 = expectedScore(r1, r2)
        const e2 = 1 - e1
        const s1 = sideScore('team1', m.result.winnerId)
        const s2 = sideScore('team2', m.result.winnerId)
        const mf = marginFactor(m.result.sets, m.result.winnerId)

        // team1·team2는 서로소이므로 한쪽 갱신이 다른 쪽 계산에 영향 없음.
        const applyTeam = (ids: string[], e: number, s: number) => {
            for (const id of ids) {
                const state = ensure(id)
                const k = pickK(state.matchesPlayed)
                const before = state.rating
                const after = clampRating(before + k * mf * (s - e))
                state.rating = after
                state.matchesPlayed += 1
                history.push({
                    matchId: m.id,
                    userId: id,
                    ratingBefore: before,
                    ratingAfter: after,
                    delta: after - before,
                })
            }
        }

        applyTeam(team1, e1, s1)
        applyTeam(team2, e2, s2)
    }

    return { ratings, history }
}

/** 표시용 반올림 (소수점 3자리). */
export function roundRating(r: number): number {
    return Math.round(r * 1000) / 1000
}

export {
    K_BASE,
    K_PROVISIONAL,
    DEFAULT_RATING,
    PROVISIONAL_THRESHOLD,
    MARGIN_WEIGHT,
    MAX_RATING,
    MIN_RATING,
}

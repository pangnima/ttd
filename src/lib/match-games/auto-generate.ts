// 자동 대진표 생성 — DB 접근 없는 순수 함수 모듈.
//
// 운영자가 지정한 코트(종류 고정) × 라운드 격자에, 참석자를 성별·NTRP 수준을 고려해
// 무작위가 아닌 규칙 기반으로 배치한다. 결과는 폼이 그대로 쓰는 SimpleMatchEntry[]로 반환되어
// 기존 검증(validateEntries) → buildMatchGamePayload → createMatchGameAction 경로를 탄다.
//
// 설계 요약
//  - 비슷한 실력끼리 같은 코트(코트 내 NTRP 폭 최소화) + 코트 내부는 스네이크 분할로 균형 팀
//  - 실력 균형 · 공평성(경기 수) · 다양성(파트너/상대 안 겹침)을 가중 비용으로 균형있게 반영
//  - NTRP 미입력/게스트(0)는 기본값(평점 보유자 평균, 없으면 3.0)으로 간주
//
// 향후 NTRP 레이팅 시스템이 도입되면 effectiveNtrp 입력만 교체하면 그대로 동작한다.

import type { CourtSurface, MatchType, User } from '@/types'
import { addMinutes, genId, type FormCourt, type SimpleMatchEntry } from '@/lib/match-games/form-mapping'

/** 코트별 고정 종류를 포함한 생성 설정용 코트 */
export type CourtConfig = {
    id: string
    label: string
    surface: CourtSurface | ''
    matchType: MatchType
}

/** generateMatchGame 입력 */
export type GenerateConfig = {
    courts: CourtConfig[]
    rounds: number           // 라운드(타임슬롯) 개수
    baseStart: string        // "09:00"
    slotMinutes: number      // 슬롯 길이(분)
    attendees: User[]        // 참석자 (gender, ntrp 포함)
    defaultNtrp?: number     // 미입력 선수 대체값 (생략 시 참석자에서 계산)
}

/** generateMatchGame 결과 */
export type GenerateResult = {
    courts: FormCourt[]
    entries: SimpleMatchEntry[]
    warnings: string[]
}

// 비용 함수 가중치 — "균형있게 모두 반영". 필요 시 튜닝 가능.
export const WEIGHTS = {
    skill: 1.0,     // 코트 내 NTRP 폭 + 복식 팀 전력 차이
    fairness: 1.0,  // 적게 뛴 선수 우선 (경기 수 공평성)
    variety: 1.0,   // 파트너/상대 재대결 페널티
}

const FALLBACK_NTRP = 3.0

/** 참석자 중 평점 보유자 평균. 없으면 3.0. */
export function computeDefaultNtrp(attendees: User[]): number {
    const rated = attendees.map((a) => a.ntrp).filter((n) => typeof n === 'number' && n > 0)
    if (rated.length === 0) return FALLBACK_NTRP
    return rated.reduce((sum, n) => sum + n, 0) / rated.length
}

/** 정렬 무관 페어 키 */
function pairKey(a: string, b: string): string {
    return a < b ? `${a}|${b}` : `${b}|${a}`
}

/** 코트 종류별 필요 인원 (size = 총 인원, male/female = 성별 강제 인원. singles는 성별 무관) */
function courtNeed(type: MatchType): { size: number; male: number; female: number } {
    switch (type) {
        case 'singles':
            return { size: 2, male: 0, female: 0 }
        case 'men_doubles':
            return { size: 4, male: 4, female: 0 }
        case 'women_doubles':
            return { size: 4, male: 0, female: 4 }
        case 'mixed_doubles':
            return { size: 4, male: 2, female: 2 }
    }
}

/** 종류가 빡빡할수록(성별 고정) 먼저 배정해 희소 성별을 유연한 단식에 빼앗기지 않게 한다. */
function tightnessRank(type: MatchType): number {
    if (type === 'men_doubles' || type === 'women_doubles') return 0
    if (type === 'mixed_doubles') return 1
    return 2 // singles
}

/** 누적 상태 — 라운드를 거치며 갱신 */
type GenState = {
    eff: Map<string, number>          // userId → effective NTRP
    playCount: Map<string, number>    // userId → 누적 경기 수
    partnerCount: Map<string, number> // pairKey → 같은 팀으로 뛴 횟수
    opponentCount: Map<string, number> // pairKey → 상대로 만난 횟수
}

function getCount(map: Map<string, number>, key: string): number {
    return map.get(key) ?? 0
}

/** k개 조합 열거 (작은 입력 전용) */
function combinations<T>(arr: T[], k: number): T[][] {
    if (k <= 0) return [[]]
    if (k > arr.length) return []
    const result: T[][] = []
    const pick = (start: number, acc: T[]) => {
        if (acc.length === k) {
            result.push([...acc])
            return
        }
        for (let i = start; i < arr.length; i++) {
            acc.push(arr[i])
            pick(i + 1, acc)
            acc.pop()
        }
    }
    pick(0, [])
    return result
}

/** 한 팀 분할안의 비용 — 팀 전력 차이(균형) + 파트너/상대 재구성 페널티(다양성) */
function splitCost(team1: User[], team2: User[], state: GenState): number {
    const eff = (u: User) => state.eff.get(u.id) ?? FALLBACK_NTRP
    const sum = (arr: User[]) => arr.reduce((acc, u) => acc + eff(u), 0)
    const teamDiff = Math.abs(sum(team1) - sum(team2))

    let variety = 0
    if (team1.length === 2) variety += Math.pow(getCount(state.partnerCount, pairKey(team1[0].id, team1[1].id)) + 1, 2)
    if (team2.length === 2) variety += Math.pow(getCount(state.partnerCount, pairKey(team2[0].id, team2[1].id)) + 1, 2)
    for (const a of team1) {
        for (const b of team2) variety += Math.pow(getCount(state.opponentCount, pairKey(a.id, b.id)) + 1, 2)
    }
    return WEIGHTS.skill * teamDiff + WEIGHTS.variety * variety
}

/**
 * 코트 내부 팀 구성. 가능한 분할안 중 전력 균형 + 다양성 비용이 가장 낮은 안을 고른다.
 * 비슷한 실력끼리 묶인 4명이라 어느 분할이든 균형은 비슷 → 파트너/상대가 안 겹치도록 회전된다.
 * state가 라운드 내 고정이므로 groupCost·toEntry·commit에서 동일 결과를 보장한다.
 */
function splitTeams(players: User[], type: MatchType, state: GenState): { team1: User[]; team2: User[] } {
    const eff = (u: User) => state.eff.get(u.id) ?? FALLBACK_NTRP

    if (type === 'singles') {
        const [p0, p1] = [...players].sort((a, b) => eff(b) - eff(a))
        return { team1: [p0], team2: [p1] }
    }

    let candidates: { team1: User[]; team2: User[] }[]
    if (type === 'mixed_doubles') {
        const m = players.filter((p) => p.gender === 'male')
        const f = players.filter((p) => p.gender === 'female')
        // 각 팀 1남1녀 보장하는 두 가지 분할
        candidates = [
            { team1: [m[0], f[0]], team2: [m[1], f[1]] },
            { team1: [m[0], f[1]], team2: [m[1], f[0]] },
        ]
    } else {
        // 남복/여복 4명 → 파트너 짝 3가지
        const p = players
        candidates = [
            { team1: [p[0], p[1]], team2: [p[2], p[3]] },
            { team1: [p[0], p[2]], team2: [p[1], p[3]] },
            { team1: [p[0], p[3]], team2: [p[1], p[2]] },
        ]
    }

    let best = candidates[0]
    let bestCost = Infinity
    for (const c of candidates) {
        const cost = splitCost(c.team1, c.team2, state)
        if (cost < bestCost) {
            bestCost = cost
            best = c
        }
    }
    return best
}

/** 한 코트(선수 묶음)의 비용. 낮을수록 좋다. */
function groupCost(players: User[], type: MatchType, state: GenState): number {
    const eff = (u: User) => state.eff.get(u.id) ?? FALLBACK_NTRP
    const effs = players.map(eff)

    // 실력: 코트 내 NTRP 폭(비슷한 실력끼리) + 팀 전력 차이(코트 내부 균형)
    const spread = Math.max(...effs) - Math.min(...effs)
    const { team1, team2 } = splitTeams(players, type, state)
    const sum = (arr: User[]) => arr.reduce((acc, u) => acc + eff(u), 0)
    const teamDiff = Math.abs(sum(team1) - sum(team2))
    const skill = spread + teamDiff

    // 공평성: 이미 많이 뛴 선수를 고르면 페널티 (선발 단계에서 적게 뛴 선수 우선)
    const fairness = players.reduce((acc, u) => acc + getCount(state.playCount, u.id), 0)

    // 다양성: 같은 팀/상대 재구성에 제곱 페널티
    let variety = 0
    const teamPairs = (t: User[]) => {
        if (t.length === 2) variety += Math.pow(getCount(state.partnerCount, pairKey(t[0].id, t[1].id)) + 1, 2)
    }
    teamPairs(team1)
    teamPairs(team2)
    for (const a of team1) {
        for (const b of team2) {
            variety += Math.pow(getCount(state.opponentCount, pairKey(a.id, b.id)) + 1, 2)
        }
    }

    return WEIGHTS.skill * skill + WEIGHTS.fairness * fairness + WEIGHTS.variety * variety
}

/** 한 코트에 채울 선수 묶음 선택. 채울 수 없으면 null. */
function selectCourtPlayers(type: MatchType, available: User[], state: GenState): User[] | null {
    const need = courtNeed(type)

    // 적게 뛴 선수 우선 + 같은 성별이면 NTRP로 1차 정렬 (스킬 밴드 형성용)
    const byFairness = (a: User, b: User) => {
        const d = getCount(state.playCount, a.id) - getCount(state.playCount, b.id)
        if (d !== 0) return d
        return (state.eff.get(a.id) ?? 0) - (state.eff.get(b.id) ?? 0)
    }

    if (type === 'mixed_doubles') {
        const males = available.filter((p) => p.gender === 'male').sort(byFairness)
        const females = available.filter((p) => p.gender === 'female').sort(byFairness)
        if (males.length < 2 || females.length < 2) return null
        // 공평성 상위 shortlist에서만 조합 탐색 (남2 + 여2)
        const mShort = males.slice(0, Math.min(males.length, 4))
        const fShort = females.slice(0, Math.min(females.length, 4))
        let best: User[] | null = null
        let bestCost = Infinity
        for (const m of combinations(mShort, 2)) {
            for (const f of combinations(fShort, 2)) {
                const group = [...m, ...f]
                const cost = groupCost(group, type, state)
                if (cost < bestCost) {
                    bestCost = cost
                    best = group
                }
            }
        }
        return best
    }

    // 단식 / 남복 / 여복 — 성별 풀에서 size명 선택
    const pool =
        type === 'men_doubles'
            ? available.filter((p) => p.gender === 'male')
            : type === 'women_doubles'
              ? available.filter((p) => p.gender === 'female')
              : available // singles: 성별 무관
    if (pool.length < need.size) return null

    // 공평성 상위 shortlist로 좁힌 뒤, 가장 비용 낮은 size 조합 선택
    const shortlist = [...pool].sort(byFairness).slice(0, Math.min(pool.length, need.size + 3))
    let best: User[] | null = null
    let bestCost = Infinity
    for (const group of combinations(shortlist, need.size)) {
        const cost = groupCost(group, type, state)
        if (cost < bestCost) {
            bestCost = cost
            best = group
        }
    }
    return best
}

type CourtAssignment = { config: CourtConfig; players: User[] }

/** 라운드 내 같은 성별 선수 페어 스왑으로 코트 배치를 국소 개선. */
function improveRound(assignments: CourtAssignment[], state: GenState): void {
    let improved = true
    let guard = 0
    while (improved && guard++ < 50) {
        improved = false
        for (let i = 0; i < assignments.length; i++) {
            for (let j = i + 1; j < assignments.length; j++) {
                const A = assignments[i]
                const B = assignments[j]
                for (let ai = 0; ai < A.players.length; ai++) {
                    for (let bi = 0; bi < B.players.length; bi++) {
                        const pa = A.players[ai]
                        const pb = B.players[bi]
                        if (pa.gender !== pb.gender) continue // 성별 보존 스왑만 허용
                        const before =
                            groupCost(A.players, A.config.matchType, state) +
                            groupCost(B.players, B.config.matchType, state)
                        A.players[ai] = pb
                        B.players[bi] = pa
                        const after =
                            groupCost(A.players, A.config.matchType, state) +
                            groupCost(B.players, B.config.matchType, state)
                        if (after < before - 1e-9) {
                            improved = true
                        } else {
                            A.players[ai] = pa // 롤백
                            B.players[bi] = pb
                        }
                    }
                }
            }
        }
    }
}

/** 한 코트 배치를 SimpleMatchEntry로 변환 */
function toEntry(assignment: CourtAssignment, startAt: string, endAt: string, state: GenState): SimpleMatchEntry {
    const { config, players } = assignment
    const { team1, team2 } = splitTeams(players, config.matchType, state)
    const base = {
        id: genId('match'),
        courtId: config.id,
        startAt,
        endAt,
        matchType: config.matchType,
        player1Id: '',
        player2Id: '',
        team1: ['', ''] as [string, string],
        team2: ['', ''] as [string, string],
    }
    if (config.matchType === 'singles') {
        base.player1Id = team1[0].id
        base.player2Id = team2[0].id
    } else {
        base.team1 = [team1[0].id, team1[1].id]
        base.team2 = [team2[0].id, team2[1].id]
    }
    return base
}

/** 라운드 확정 후 누적 상태(경기 수·파트너·상대) 갱신 */
function commitAssignment(assignment: CourtAssignment, state: GenState): void {
    const { config, players } = assignment
    for (const p of players) {
        state.playCount.set(p.id, getCount(state.playCount, p.id) + 1)
    }
    const { team1, team2 } = splitTeams(players, config.matchType, state)
    const bump = (map: Map<string, number>, a: string, b: string) =>
        map.set(pairKey(a, b), getCount(map, pairKey(a, b)) + 1)
    if (team1.length === 2) bump(state.partnerCount, team1[0].id, team1[1].id)
    if (team2.length === 2) bump(state.partnerCount, team2[0].id, team2[1].id)
    for (const a of team1) {
        for (const b of team2) bump(state.opponentCount, a.id, b.id)
    }
}

const TYPE_LABEL: Record<MatchType, string> = {
    singles: '단식',
    men_doubles: '남복',
    women_doubles: '여복',
    mixed_doubles: '혼복',
}

/**
 * 자동 대진표 생성 진입점.
 * 코트 × 라운드 격자에 참석자를 배치하고, 채우지 못한 슬롯은 warnings로 안내한다.
 */
export function generateMatchGame(config: GenerateConfig): GenerateResult {
    const { courts, rounds, baseStart, slotMinutes, attendees } = config
    const warnings: string[] = []

    const formCourts: FormCourt[] = courts.map((c) => ({
        id: c.id,
        label: c.label,
        surface: c.surface,
        matchType: c.matchType,
    }))

    if (courts.length === 0) return { courts: formCourts, entries: [], warnings: ['코트를 1개 이상 추가해주세요.'] }
    if (rounds <= 0) return { courts: formCourts, entries: [], warnings: ['라운드 수를 1 이상으로 지정해주세요.'] }
    if (attendees.length === 0) return { courts: formCourts, entries: [], warnings: ['참석자를 1명 이상 등록해주세요.'] }

    const defaultNtrp = config.defaultNtrp ?? computeDefaultNtrp(attendees)
    const state: GenState = {
        eff: new Map(attendees.map((u) => [u.id, u.ntrp && u.ntrp > 0 ? u.ntrp : defaultNtrp])),
        playCount: new Map(),
        partnerCount: new Map(),
        opponentCount: new Map(),
    }

    const entries: SimpleMatchEntry[] = []
    // 빡빡한 종류(성별 고정) 코트를 먼저 배정하도록 정렬 (결과 entries는 원래 코트 순서로 정렬)
    const orderedCourts = [...courts].sort((a, b) => tightnessRank(a.matchType) - tightnessRank(b.matchType))

    for (let r = 0; r < rounds; r++) {
        const startAt = addMinutes(baseStart, r * slotMinutes)
        const endAt = addMinutes(startAt, slotMinutes)

        const available = new Map(attendees.map((u) => [u.id, u]))
        const assignments: CourtAssignment[] = []

        for (const court of orderedCourts) {
            const picked = selectCourtPlayers(court.matchType, [...available.values()], state)
            if (!picked) {
                warnings.push(`${r + 1}라운드 ${court.label}(${TYPE_LABEL[court.matchType]}): 인원이 부족해 경기를 생성하지 못했습니다.`)
                continue
            }
            for (const p of picked) available.delete(p.id)
            assignments.push({ config: court, players: picked })
        }

        improveRound(assignments, state)

        // entries는 코트 원래 순서로, 상태 갱신은 배치 단위로
        const byCourtOrder = [...assignments].sort(
            (a, b) => courts.indexOf(a.config) - courts.indexOf(b.config)
        )
        for (const assignment of byCourtOrder) {
            entries.push(toEntry(assignment, startAt, endAt, state))
        }
        for (const assignment of assignments) {
            commitAssignment(assignment, state)
        }
    }

    return { courts: formCourts, entries, warnings }
}

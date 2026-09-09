// 대진 배치 코어 — 격자(코트 × 라운드)를 모르는 순수 규칙 모듈.
//
// 클럽 대진표(auto-generate.ts)와 매칭 룸 자동 대진표(match-rooms/lineup.ts)가 이 코어를 공유한다.
// 두 화면의 차이는 전부 옵션 세 개로 표현된다:
//
//  - genderMode  : 클럽은 'hard'(남복 코트에 여성이 들어가면 안 된다) / 룸은 'soft'
//                  (모인 사람은 다 뛰어야 하므로 성별이 안 맞아도 제외하지 않는다)
//  - weights     : 클럽은 균형 고정 / 룸은 프리셋(실력·다양성)으로 사용자가 고른다
//  - requireMemberPerTeam : 룸의 대진은 match_requests 행이 되고 requester/opponent가 NOT NULL이라
//                  각 팀에 회원이 최소 1명 있어야 한다. 클럽 대진표에는 그런 제약이 없다.
//
// 배치 대상은 LineupPlayer 하나로 좁힌다 — 클럽은 User, 룸은 방 참가자에서 변환해 들어온다.
// NTRP는 여기 오기 전에 이미 파생된 값(클럽 = users.ntrp 또는 참석자 평균, 룸 = personal_ntrp ?? ntrp)이다.

import type { MatchType } from '@/types'

/** 배치 대상 1명 */
export type LineupPlayer = {
    /** 클럽 = userId, 룸 = 참가자 키(회원 uuid 또는 게스트 이름). 페어 키·중복 판정의 단위 */
    key: string
    name: string
    /** 이미 파생된 유효 NTRP */
    ntrp: number
    /** 미상 허용 — soft 모드에서만 들어올 수 있다 */
    gender?: 'male' | 'female'
    /** requireMemberPerTeam 제약용 */
    isMember: boolean
}

export type LineupTeams = { team1: LineupPlayer[]; team2: LineupPlayer[] }

export type LineupWeights = {
    skill: number // 코트 내 NTRP 폭 + 팀 전력 차이
    fairness: number // 적게 뛴 선수 우선 (경기 수 공평성)
    variety: number // 파트너/상대 재구성 페널티
}

/** "균형있게 모두 반영" — 클럽 대진표의 기존 가중치이자 룸 '균형' 프리셋 */
export const DEFAULT_LINEUP_WEIGHTS: LineupWeights = { skill: 1.0, fairness: 1.0, variety: 1.0 }

export type LineupOptions = {
    weights: LineupWeights
    /** 'hard' = 성별이 안 맞는 사람은 아예 제외 / 'soft' = 선호하되 인원이 안 맞으면 그냥 넣는다 */
    genderMode: 'hard' | 'soft'
    /** 각 팀에 회원(isMember)이 최소 1명 */
    requireMemberPerTeam: boolean
}

export const DEFAULT_LINEUP_OPTIONS: LineupOptions = {
    weights: DEFAULT_LINEUP_WEIGHTS,
    genderMode: 'hard',
    requireMemberPerTeam: false,
}

/** 누적 상태 — 라운드(또는 게임)를 거치며 갱신된다 */
export type LineupState = {
    playCount: Map<string, number> // key → 누적 경기 수
    partnerCount: Map<string, number> // pairKey → 같은 팀으로 뛴 횟수
    opponentCount: Map<string, number> // pairKey → 상대로 만난 횟수
}

export function createLineupState(): LineupState {
    return { playCount: new Map(), partnerCount: new Map(), opponentCount: new Map() }
}

/** 정렬 무관 페어 키 */
export function pairKey(a: string, b: string): string {
    return a < b ? `${a}|${b}` : `${b}|${a}`
}

function getCount(map: Map<string, number>, key: string): number {
    return map.get(key) ?? 0
}

/** 코트 종류별 필요 인원 (size = 총 인원, male/female = 성별 강제 인원. singles는 성별 무관) */
export function courtNeed(type: MatchType): { size: number; male: number; female: number } {
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

/** k개 조합 열거 (작은 입력 전용) */
export function combinations<T>(arr: T[], k: number): T[][] {
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

const sumNtrp = (arr: LineupPlayer[]) => arr.reduce((acc, p) => acc + p.ntrp, 0)

/** 팀 전력 차이 — 미리보기에서도 쓴다 */
export function teamDiff(teams: LineupTeams): number {
    return Math.abs(sumNtrp(teams.team1) - sumNtrp(teams.team2))
}

/** 한 팀 분할안의 비용 — 팀 전력 차이(균형) + 파트너/상대 재구성 페널티(다양성) */
function splitCost(team1: LineupPlayer[], team2: LineupPlayer[], state: LineupState, opts: LineupOptions): number {
    let variety = 0
    if (team1.length === 2) variety += Math.pow(getCount(state.partnerCount, pairKey(team1[0].key, team1[1].key)) + 1, 2)
    if (team2.length === 2) variety += Math.pow(getCount(state.partnerCount, pairKey(team2[0].key, team2[1].key)) + 1, 2)
    for (const a of team1) {
        for (const b of team2) variety += Math.pow(getCount(state.opponentCount, pairKey(a.key, b.key)) + 1, 2)
    }
    return opts.weights.skill * Math.abs(sumNtrp(team1) - sumNtrp(team2)) + opts.weights.variety * variety
}

/** 복식 4명 → 파트너 짝 3가지 */
function doublesCandidates(players: LineupPlayer[]): LineupTeams[] {
    const [p0, p1, p2, p3] = players
    return [
        { team1: [p0, p1], team2: [p2, p3] },
        { team1: [p0, p2], team2: [p1, p3] },
        { team1: [p0, p3], team2: [p1, p2] },
    ]
}

/**
 * 코트 내부 팀 구성. 가능한 분할안 중 전력 균형 + 다양성 비용이 가장 낮은 안을 고른다.
 * 비슷한 실력끼리 묶인 4명이라 어느 분할이든 균형은 비슷 → 파트너/상대가 안 겹치도록 회전된다.
 * state가 배치 단위로 고정이므로 groupCost·commit에서 동일 결과를 보장한다.
 */
export function splitTeams(
    players: LineupPlayer[],
    type: MatchType,
    state: LineupState,
    opts: LineupOptions,
): LineupTeams {
    if (type === 'singles') {
        const [p0, p1] = [...players].sort((a, b) => b.ntrp - a.ntrp)
        return { team1: [p0], team2: [p1] }
    }

    let candidates: LineupTeams[]
    const males = players.filter((p) => p.gender === 'male')
    const females = players.filter((p) => p.gender === 'female')
    if (type === 'mixed_doubles' && males.length === 2 && females.length === 2) {
        // 각 팀 1남1녀를 보장하는 두 가지 분할
        candidates = [
            { team1: [males[0], females[0]], team2: [males[1], females[1]] },
            { team1: [males[0], females[1]], team2: [males[1], females[0]] },
        ]
    } else {
        // 남복·여복, 그리고 성별이 안 맞는 soft 혼복
        candidates = doublesCandidates(players)
    }

    if (opts.requireMemberPerTeam) {
        const ok = candidates.filter((c) => c.team1.some((p) => p.isMember) && c.team2.some((p) => p.isMember))
        // 어느 분할도 만족하지 못하면(회원이 1명 이하) 원안을 남겨 호출자가 판정하게 둔다
        if (ok.length > 0) candidates = ok
    }

    let best = candidates[0]
    let bestCost = Infinity
    for (const c of candidates) {
        const cost = splitCost(c.team1, c.team2, state, opts)
        if (cost < bestCost) {
            bestCost = cost
            best = c
        }
    }
    return best
}

/** 한 코트(선수 묶음)의 비용. 낮을수록 좋다. */
export function groupCost(
    players: LineupPlayer[],
    type: MatchType,
    state: LineupState,
    opts: LineupOptions,
): number {
    // 실력: 코트 내 NTRP 폭(비슷한 실력끼리) + 팀 전력 차이(코트 내부 균형)
    const effs = players.map((p) => p.ntrp)
    const spread = Math.max(...effs) - Math.min(...effs)
    const teams = splitTeams(players, type, state, opts)
    const skill = spread + teamDiff(teams)

    // 공평성: 이미 많이 뛴 선수를 고르면 페널티 (선발 단계에서 적게 뛴 선수 우선)
    const fairness = players.reduce((acc, p) => acc + getCount(state.playCount, p.key), 0)

    // 다양성: 같은 팀/상대 재구성에 제곱 페널티
    let variety = 0
    const teamPairs = (t: LineupPlayer[]) => {
        if (t.length === 2) variety += Math.pow(getCount(state.partnerCount, pairKey(t[0].key, t[1].key)) + 1, 2)
    }
    teamPairs(teams.team1)
    teamPairs(teams.team2)
    for (const a of teams.team1) {
        for (const b of teams.team2) {
            variety += Math.pow(getCount(state.opponentCount, pairKey(a.key, b.key)) + 1, 2)
        }
    }

    return opts.weights.skill * skill + opts.weights.fairness * fairness + opts.weights.variety * variety
}

/** 회원 최소 1명 제약을 만족할 수 있는 묶음인가 — 분할 후보가 하나라도 통과하는지로 본다 */
function canSatisfyMemberRule(players: LineupPlayer[], type: MatchType, opts: LineupOptions): boolean {
    if (!opts.requireMemberPerTeam) return true
    const members = players.filter((p) => p.isMember).length
    if (type === 'singles') return members === players.length
    return members >= 2
}

/** 한 자리(코트·게임)에 채울 선수 묶음 선택. 채울 수 없으면 null. */
export function selectPlayers(
    type: MatchType,
    available: LineupPlayer[],
    state: LineupState,
    opts: LineupOptions,
): LineupPlayer[] | null {
    const need = courtNeed(type)

    // 적게 뛴 선수 우선 + 같은 조건이면 NTRP로 1차 정렬 (스킬 밴드 형성용)
    const byFairness = (a: LineupPlayer, b: LineupPlayer) => {
        const d = getCount(state.playCount, a.key) - getCount(state.playCount, b.key)
        if (d !== 0) return d
        return a.ntrp - b.ntrp
    }

    const pickBest = (groups: LineupPlayer[][]): LineupPlayer[] | null => {
        let best: LineupPlayer[] | null = null
        let bestCost = Infinity
        for (const group of groups) {
            if (!canSatisfyMemberRule(group, type, opts)) continue
            const cost = groupCost(group, type, state, opts)
            if (cost < bestCost) {
                bestCost = cost
                best = group
            }
        }
        return best
    }

    if (type === 'mixed_doubles') {
        const males = available.filter((p) => p.gender === 'male').sort(byFairness)
        const females = available.filter((p) => p.gender === 'female').sort(byFairness)
        if (males.length >= 2 && females.length >= 2) {
            // 공평성 상위 shortlist에서만 조합 탐색 (남2 + 여2)
            const mShort = males.slice(0, Math.min(males.length, 4))
            const fShort = females.slice(0, Math.min(females.length, 4))
            const groups: LineupPlayer[][] = []
            for (const m of combinations(mShort, 2)) {
                for (const f of combinations(fShort, 2)) groups.push([...m, ...f])
            }
            const best = pickBest(groups)
            if (best || opts.genderMode === 'hard') return best
        } else if (opts.genderMode === 'hard') {
            return null
        }
        // soft: 성별 구성을 맞출 수 없으면 성별을 가리지 않고 4명을 뽑는다(참가자가 누락되지 않게)
    } else if (type === 'men_doubles' || type === 'women_doubles') {
        const wanted = type === 'men_doubles' ? 'male' : 'female'
        const pool = available.filter((p) => p.gender === wanted)
        if (pool.length >= need.size) {
            const best = pickBest(shortlistCombos(pool, need.size, byFairness))
            if (best || opts.genderMode === 'hard') return best
        } else if (opts.genderMode === 'hard') {
            return null
        }
        // soft: 같은 성별로 못 채우면 전체 풀에서 채운다
    }

    if (available.length < need.size) return null
    return pickBest(shortlistCombos(available, need.size, byFairness))
}

/** 공평성 상위 shortlist(size + 3명)로 좁힌 뒤 size 조합 전수 */
function shortlistCombos(
    pool: LineupPlayer[],
    size: number,
    byFairness: (a: LineupPlayer, b: LineupPlayer) => number,
): LineupPlayer[][] {
    const shortlist = [...pool].sort(byFairness).slice(0, Math.min(pool.length, size + 3))
    return combinations(shortlist, size)
}

/** 배치 확정 후 누적 상태(경기 수·파트너·상대) 갱신 */
export function commitLineup(
    players: LineupPlayer[],
    type: MatchType,
    state: LineupState,
    opts: LineupOptions,
): LineupTeams {
    const teams = splitTeams(players, type, state, opts)
    for (const p of players) {
        state.playCount.set(p.key, getCount(state.playCount, p.key) + 1)
    }
    const bump = (map: Map<string, number>, a: string, b: string) =>
        map.set(pairKey(a, b), getCount(map, pairKey(a, b)) + 1)
    if (teams.team1.length === 2) bump(state.partnerCount, teams.team1[0].key, teams.team1[1].key)
    if (teams.team2.length === 2) bump(state.partnerCount, teams.team2[0].key, teams.team2[1].key)
    for (const a of teams.team1) {
        for (const b of teams.team2) bump(state.opponentCount, a.key, b.key)
    }
    return teams
}

// 대진 배치 코어 — 격자(코트 × 라운드)를 모르는 순수 규칙 모듈.
//
// 클럽 대진표(auto-generate.ts)와 매칭 룸 자동 대진표(match-rooms/lineup.ts)가 이 코어를 공유한다.
// 두 화면의 차이는 전부 옵션 세 개로 표현된다:
//
//  - genderMode  : 클럽은 'hard'(남복 코트에 여성이 들어가면 안 된다) / 룸은 'soft'
//                  (모인 사람은 다 뛰어야 하므로 성별이 안 맞아도 제외하지 않는다)
//  - weights     : 클럽은 균형 고정 / 룸은 프리셋(실력·다양성)으로 사용자가 고른다
//  - memberRule  : 룸의 대진은 저장되는 행에 소유자(회원)가 있어야 한다. 'perGame'(0076)은 게임에 회원이
//                  최소 1명 — 양 팀에 회원을 둘 수 있으면 그렇게 가르고(상호 확인 게임), 안 되면 한 팀만
//                  회원인 게임(그 회원의 자유 기록)을 허용한다. 'perTeam'은 0066~0075의 옛 규칙(각 팀 1명),
//                  클럽 대진표는 'none'.
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
    /** memberRule 제약용 */
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

/**
 * 회원(isMember) 제약 — 'none' 없음 / 'perTeam' 각 팀 1명 / 'perGame' 게임에 1명(양 팀이 가능하면 우선).
 * 룸이 'perGame'인 이유: 양 팀 회원 게임은 match_requests로, 한 팀 회원 게임은 그 회원의 자유 기록으로
 * 저장되므로 회원이 한 명도 없는 게임만 저장할 자리가 없다(0076).
 */
export type MemberRule = 'none' | 'perTeam' | 'perGame'

export type LineupOptions = {
    weights: LineupWeights
    /** 'hard' = 성별이 안 맞는 사람은 아예 제외 / 'soft' = 선호하되 인원이 안 맞으면 그냥 넣는다 */
    genderMode: 'hard' | 'soft'
    memberRule: MemberRule
}

export const DEFAULT_LINEUP_OPTIONS: LineupOptions = {
    weights: DEFAULT_LINEUP_WEIGHTS,
    genderMode: 'hard',
    memberRule: 'none',
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
        return memberTeamFirst({ team1: [p0], team2: [p1] }, opts)
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

    if (opts.memberRule !== 'none') {
        const ok = candidates.filter((c) => c.team1.some((p) => p.isMember) && c.team2.some((p) => p.isMember))
        // 어느 분할도 만족하지 못하면(회원이 1명 이하) 원안을 남겨 호출자가 판정하게 둔다.
        // perGame에서도 양 팀에 회원을 둘 수 있으면 **반드시** 그렇게 — 회원 둘이 같은 팀에 서고 상대가
        // 전부 게스트면 자유 기록이 되어 두 번째 회원에게 기록이 남지 않는다.
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
    return memberTeamFirst(best, opts)
}

/**
 * perGame에서 회원이 team2에만 있으면 팀을 맞바꾼다 — 저장(create_room_lineup의 소유자 선택)과
 * 편집(fromRoomGames)이 "team1의 첫 자리 = 게임 소유자"를 전제하므로, 미리보기와 저장 결과의 팀 순서가
 * 같아야 사람이 고친 자리가 저장 뒤에도 같은 자리에 보인다.
 */
function memberTeamFirst(teams: LineupTeams, opts: LineupOptions): LineupTeams {
    if (opts.memberRule === 'none') return teams
    // 팀 안에서도 회원이 앞자리 — 저장 뒤 다시 읽으면 requester·opponent(첫 회원)가 각 팀의 첫 자리로 온다
    const membersFirst = (team: LineupPlayer[]) =>
        [...team.filter((p) => p.isMember), ...team.filter((p) => !p.isMember)]
    const ordered = { team1: membersFirst(teams.team1), team2: membersFirst(teams.team2) }
    if (ordered.team1.some((p) => p.isMember) || !ordered.team2.some((p) => p.isMember)) return ordered
    return { team1: ordered.team2, team2: ordered.team1 }
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

/** 회원 제약을 만족할 수 있는 묶음인가 — perTeam은 분할 후보가 하나라도 통과하는지, perGame은 회원이 있는지 */
function canSatisfyMemberRule(players: LineupPlayer[], type: MatchType, rule: MemberRule): boolean {
    if (rule === 'none') return true
    const members = players.filter((p) => p.isMember).length
    if (rule === 'perGame') return members >= 1
    if (type === 'singles') return members === players.length
    return members >= 2
}

/**
 * 성별 구성이 요구와 얼마나 어긋나는가. hard 모드에서는 풀을 이미 성별로 걸러 언제나 0이고,
 * soft 모드에서는 이 값이 비용의 최우선 항이 되어 "가능하면 맞추되 사람을 빼지는 않는다"가 된다.
 */
function genderPenalty(group: LineupPlayer[], type: MatchType): number {
    if (type === 'singles') return 0
    const need = courtNeed(type)
    const males = group.filter((p) => p.gender === 'male').length
    const females = group.filter((p) => p.gender === 'female').length
    return Math.abs(males - need.male) + Math.abs(females - need.female)
}

/** 성별 불일치는 실력·공평성·다양성 어떤 비용보다 우선한다 */
const GENDER_PENALTY_WEIGHT = 1000

/** 공평성 상위 shortlist(size + 3명)로 좁힌 뒤 size 조합 전수 */
function shortlistCombos(
    pool: LineupPlayer[],
    size: number,
    byFairness: (a: LineupPlayer, b: LineupPlayer) => number,
): LineupPlayer[][] {
    const shortlist = [...pool].sort(byFairness).slice(0, Math.min(pool.length, size + 3))
    return combinations(shortlist, size)
}

/**
 * 한 자리(코트·게임)에 채울 선수 묶음 선택. 채울 수 없으면 null.
 *
 * `mandatory`는 **반드시 들어가야 하는 선수**다 — 룸이 "덜 뛴 사람은 무조건 다음 게임에" 규칙으로
 * 출전 편차를 1 이내로 묶을 때 쓴다. 격자(클럽)는 빈 배열이라 경로가 달라지지 않는다.
 */
export function selectPlayers(
    type: MatchType,
    available: LineupPlayer[],
    state: LineupState,
    opts: LineupOptions,
    mandatory: LineupPlayer[] = [],
): LineupPlayer[] | null {
    const need = courtNeed(type)
    const take = need.size - mandatory.length
    if (take < 0) return null

    const fixed = new Set(mandatory.map((p) => p.key))
    const rest = mandatory.length > 0 ? available.filter((p) => !fixed.has(p.key)) : available

    // 적게 뛴 선수 우선 + 같은 조건이면 NTRP로 1차 정렬 (스킬 밴드 형성용)
    const byFairness = (a: LineupPlayer, b: LineupPlayer) => {
        const d = getCount(state.playCount, a.key) - getCount(state.playCount, b.key)
        if (d !== 0) return d
        return a.ntrp - b.ntrp
    }

    const pickBestBy = (combos: LineupPlayer[][], rule: MemberRule): LineupPlayer[] | null => {
        let best: LineupPlayer[] | null = null
        let bestCost = Infinity
        for (const combo of combos) {
            const group = mandatory.length > 0 ? [...mandatory, ...combo] : combo
            if (group.length !== need.size) continue
            if (!canSatisfyMemberRule(group, type, rule)) continue
            const cost =
                GENDER_PENALTY_WEIGHT * genderPenalty(group, type) + groupCost(group, type, state, opts)
            if (cost < bestCost) {
                bestCost = cost
                best = group
            }
        }
        return best
    }
    // perGame은 두 단계다 — 양 팀에 회원을 둘 수 있는 묶음(상호 확인 게임)이 하나라도 있으면 그것을,
    // 없을 때만 회원 한 명짜리 묶음(그 회원의 자유 기록)으로 물러난다. 회원이 넉넉한 방에서 회원을
    // 쉬게 하고 게스트끼리 붙이면 두 번째 회원의 기록이 사라지므로 비용이 아니라 단계로 가른다.
    const pickBest = (combos: LineupPlayer[][]): LineupPlayer[] | null => {
        if (opts.memberRule !== 'perGame') return pickBestBy(combos, opts.memberRule)
        return pickBestBy(combos, 'perTeam') ?? pickBestBy(combos, 'perGame')
    }

    if (opts.genderMode === 'soft') {
        // 룸: 모인 사람은 다 뛴다. 성별은 걸러 내지 않고 비용의 최우선 항으로만 반영한다
        if (rest.length < take) return null
        return pickBest(shortlistCombos(rest, take, byFairness))
    }

    // 격자(hard): 성별이 안 맞는 사람은 후보에서 제외한다
    if (type === 'mixed_doubles') {
        const males = rest.filter((p) => p.gender === 'male').sort(byFairness)
        const females = rest.filter((p) => p.gender === 'female').sort(byFairness)
        if (males.length < 2 || females.length < 2) return null
        // 공평성 상위 shortlist에서만 조합 탐색 (남2 + 여2)
        const mShort = males.slice(0, Math.min(males.length, 4))
        const fShort = females.slice(0, Math.min(females.length, 4))
        const combos: LineupPlayer[][] = []
        for (const m of combinations(mShort, 2)) {
            for (const f of combinations(fShort, 2)) combos.push([...m, ...f])
        }
        return pickBest(combos)
    }

    const pool =
        type === 'men_doubles'
            ? rest.filter((p) => p.gender === 'male')
            : type === 'women_doubles'
              ? rest.filter((p) => p.gender === 'female')
              : rest // singles: 성별 무관
    if (pool.length < take) return null
    return pickBest(shortlistCombos(pool, take, byFairness))
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

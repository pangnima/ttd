import type { MatchType } from '@/types'
import {
    commitLineup,
    courtNeed,
    createLineupState,
    selectPlayers,
    type LineupOptions,
    type LineupPlayer,
    type LineupWeights,
} from '@/lib/match-games/lineup-core'

/**
 * 매칭 룸 자동 대진표 (순수 — Week 40).
 *
 * 룸은 코트가 하나이므로 대진은 격자가 아니라 **순서 있는 게임 목록**이다. 클럽 대진표와 다른 점 셋:
 *  - 모인 사람은 다 뛴다 → 성별은 하드 제약이 아니라 선호(genderMode 'soft')
 *  - 저장하면 match_requests 행이 되고 requester/opponent가 NOT NULL → 각 팀에 회원 최소 1명
 *  - 가중치를 사용자가 프리셋으로 고른다
 *
 * 그리고 룸에서는 "골고루 뛴다"가 눈에 보이는 약속이라, 선발 전에 **출전 계층**을 잘라
 * 덜 뛴 사람을 강제로 넣는다 — 이것이 출전 편차 ≤ 1을 보장한다.
 */

export type LineupPreset = 'balanced' | 'skill' | 'variety'

export const LINEUP_PRESET_WEIGHTS: Record<LineupPreset, LineupWeights> = {
    balanced: { skill: 1, fairness: 1, variety: 1 },
    skill: { skill: 2, fairness: 1, variety: 0.5 },
    variety: { skill: 0.5, fairness: 1, variety: 2 },
}

export const LINEUP_PRESETS: { value: LineupPreset; label: string; hint: string }[] = [
    { value: 'balanced', label: '균형', hint: '실력 차이와 파트너 섞기를 고르게 반영합니다.' },
    { value: 'skill', label: '실력 균형 우선', hint: '팀 전력 차이를 가장 먼저 줄입니다. 접전 위주.' },
    { value: 'variety', label: '골고루 섞기 우선', hint: '같은 파트너·상대가 반복되지 않게 합니다.' },
]

/** 방 하나에 만들 수 있는 게임 수 상한 — 로테이션 finalize(MAX_GAMES)와 같은 값 */
export const ROOM_LINEUP_MAX_GAMES = 20

/** 1인당 경기 수 선택지 */
export const PER_PLAYER_OPTIONS = [1, 2, 3, 4, 5, 6] as const

export type LineupGame = {
    seq: number // 1부터
    matchType: MatchType
    team1: LineupPlayer[]
    team2: LineupPlayer[]
}

export type LineupResult = {
    games: LineupGame[]
    /** games[i]에서 쉬는 사람들의 key */
    resting: string[][]
    /** key → 출전 횟수 (한 번도 못 뛴 사람도 0으로 들어간다) */
    playCounts: Record<string, number>
    warnings: string[]
}

export type BuildRoomLineupOptions = {
    matchType: MatchType
    games: number
    preset: LineupPreset
    /** 같은 시드 = 같은 대진. [다시 뽑기]는 시드만 바꾼다 */
    seed: number
}

/**
 * 1인당 경기 수 → 총 게임 수. 4명·3경기 → 3게임, 6명·2경기 → 3게임.
 * 나누어떨어지지 않으면 반올림하고, 1 이상 ROOM_LINEUP_MAX_GAMES 이하로 묶는다.
 */
export function gamesForPerPlayer(playerCount: number, perPlayer: number, isDoubles: boolean): number {
    if (playerCount <= 0 || perPlayer <= 0) return 0
    const slots = isDoubles ? 4 : 2
    const raw = Math.round((playerCount * perPlayer) / slots)
    return Math.min(ROOM_LINEUP_MAX_GAMES, Math.max(1, raw))
}

/** mulberry32 — 작고 결정적인 PRNG. 비용이 같은 후보들의 순서를 흔드는 데만 쓴다 */
function mulberry32(seed: number): () => number {
    let a = seed >>> 0
    return () => {
        a = (a + 0x6d2b79f5) >>> 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

function shuffled<T>(arr: T[], rng: () => number): T[] {
    const out = [...arr]
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1))
        ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
}

/**
 * 출전 계층 — 덜 뛴 사람부터 자른다.
 * `mandatory`(경계보다 적게 뛴 사람)는 반드시 들어가고, 같은 횟수인 `optional` 중에서 나머지를 고른다.
 * 더 많이 뛴 사람은 아예 후보에서 빠지므로 출전 편차가 1을 넘지 않는다.
 */
function fairnessTier(
    players: LineupPlayer[],
    playCount: Map<string, number>,
    size: number,
): { mandatory: LineupPlayer[]; optional: LineupPlayer[] } {
    const count = (p: LineupPlayer) => playCount.get(p.key) ?? 0
    if (players.length <= size) return { mandatory: players, optional: [] }
    const sorted = [...players].sort((a, b) => count(a) - count(b))
    const boundary = count(sorted[size - 1])
    return {
        mandatory: players.filter((p) => count(p) < boundary),
        optional: players.filter((p) => count(p) === boundary),
    }
}

/** 요구 성별 구성과 맞는 게임인가 — soft 모드라 안 맞아도 만들어지지만 안내는 한다 */
function isGenderMatched(game: LineupGame): boolean {
    if (game.matchType === 'singles') return true
    const need = courtNeed(game.matchType)
    const all = [...game.team1, ...game.team2]
    const males = all.filter((p) => p.gender === 'male').length
    const females = all.filter((p) => p.gender === 'female').length
    return males === need.male && females === need.female
}

const TYPE_LABEL: Record<MatchType, string> = {
    singles: '단식',
    men_doubles: '남자 복식',
    women_doubles: '여자 복식',
    mixed_doubles: '혼합 복식',
}

/** 참가자로 순서 있는 대진을 만든다. 만들 수 없으면 games가 비고 warnings가 이유를 말한다 */
export function buildRoomLineup(players: LineupPlayer[], opts: BuildRoomLineupOptions): LineupResult {
    const warnings: string[] = []
    const empty = (): LineupResult => ({ games: [], resting: [], playCounts: {}, warnings })

    const need = courtNeed(opts.matchType)
    if (opts.games < 1) {
        warnings.push('경기 수를 1 이상으로 지정해주세요.')
        return empty()
    }
    if (players.length < need.size) {
        warnings.push(`${TYPE_LABEL[opts.matchType]} 대진에는 참가자가 ${need.size}명 이상 필요합니다.`)
        return empty()
    }
    // 각 팀에 회원이 최소 1명 — 저장되는 게임이 match_requests 행이기 때문
    const members = players.filter((p) => p.isMember).length
    if (members < 2) {
        warnings.push('각 팀에 회원이 최소 1명씩 필요합니다. 회원 참가자를 2명 이상 모아주세요.')
        return empty()
    }

    const count = Math.min(opts.games, ROOM_LINEUP_MAX_GAMES)
    if (opts.games > ROOM_LINEUP_MAX_GAMES) {
        warnings.push(`한 번에 만들 수 있는 경기는 ${ROOM_LINEUP_MAX_GAMES}개까지입니다.`)
    }

    const lineupOptions: LineupOptions = {
        weights: LINEUP_PRESET_WEIGHTS[opts.preset],
        genderMode: 'soft',
        requireMemberPerTeam: true,
    }
    const state = createLineupState()
    const rng = mulberry32(opts.seed)

    const games: LineupGame[] = []
    const resting: string[][] = []
    for (let i = 0; i < count; i++) {
        // 비용이 같은 후보들 사이에서만 흔들린다 — 품질은 유지되고 [다시 뽑기]가 실제로 다른 결과를 낸다
        const pool = shuffled(players, rng)
        const { mandatory, optional } = fairnessTier(pool, state.playCount, need.size)
        const picked = selectPlayers(opts.matchType, optional, state, lineupOptions, mandatory)
        if (!picked) {
            warnings.push(`${i + 1}번째 경기부터는 참가자 구성으로 대진을 만들 수 없어 중단했습니다.`)
            break
        }
        const teams = commitLineup(picked, opts.matchType, state, lineupOptions)
        games.push({ seq: games.length + 1, matchType: opts.matchType, team1: teams.team1, team2: teams.team2 })
        const inGame = new Set(picked.map((p) => p.key))
        resting.push(players.filter((p) => !inGame.has(p.key)).map((p) => p.key))
    }

    if (games.some((g) => !isGenderMatched(g))) {
        warnings.push(`인원 구성상 일부 경기는 ${TYPE_LABEL[opts.matchType]} 성별 구성을 맞추지 못했습니다.`)
    }

    const playCounts: Record<string, number> = {}
    for (const p of players) playCounts[p.key] = state.playCount.get(p.key) ?? 0

    return { games, resting, playCounts, warnings }
}

import type { MatchType } from '@/types'
import { derivePublicNtrp } from '@/lib/personal-matches/ntrp'
import {
    commitLineup,
    courtNeed,
    createLineupState,
    selectPlayers,
    type LineupOptions,
    type LineupPlayer,
    type LineupWeights,
} from '@/lib/match-games/lineup-core'
import { effectiveCourtCount } from '@/lib/match-rooms/court-slots'

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

/** 방 참가자 후보의 최소 형태 — OpponentCandidate가 구조적으로 대입된다(server-only 모듈 의존 회피) */
export type LineupCandidate = {
    id: string
    name: string
    ntrp?: number
    personalNtrp?: number
    statsHidden?: boolean
    gender?: 'male' | 'female'
    isGuest: boolean
}

/** 아무도 평점이 없을 때의 대체값 — auto-generate의 FALLBACK_NTRP와 같은 값 */
const FALLBACK_NTRP = 3.0

/**
 * 방 참가자 → 배치 대상.
 * NTRP는 `derivePublicNtrp`(DB `derive_public_ntrp`의 미러)를 따른다 — **화면에 보이는 값과 같아야 한다**.
 * 옵션 칩이 통계 비공개 회원의 자가선언 값을 보여주는데 배치는 개인 NTRP로 하면,
 * 3.0이라고 써 놓고 3.42로 균형을 맞추는 셈이 된다.
 * 값이 없으면 아는 사람들의 평균으로 채운다 — 평점이 없다고 대진에서 빠지면 안 되기 때문.
 */
export function toLineupPlayers(candidates: LineupCandidate[]): LineupPlayer[] {
    const ntrpOf = (c: LineupCandidate) => derivePublicNtrp(c)
    const known = candidates.map(ntrpOf).filter((n): n is number => typeof n === 'number' && n > 0)
    const fallback = known.length > 0 ? known.reduce((sum, n) => sum + n, 0) / known.length : FALLBACK_NTRP
    return candidates.map((c) => ({
        key: c.id,
        name: c.name,
        ntrp: ntrpOf(c) ?? fallback,
        gender: c.gender,
        isMember: !c.isGuest,
    }))
}

export type LineupPreset = 'balanced' | 'skill' | 'variety'

export const LINEUP_PRESET_WEIGHTS: Record<LineupPreset, LineupWeights> = {
    balanced: { skill: 1, fairness: 1, variety: 1 },
    skill: { skill: 2, fairness: 1, variety: 0.5 },
    variety: { skill: 0.5, fairness: 1, variety: 2 },
}

// 라벨은 짧게 — 토글이 좁은 열에 들어가므로 길면 줄바꿈된다. 자세한 설명은 hint가 아래 줄에서 한다
export const LINEUP_PRESETS: { value: LineupPreset; label: string; hint: string }[] = [
    { value: 'balanced', label: '균형', hint: '실력 차이와 파트너 섞기를 고르게 반영합니다.' },
    { value: 'skill', label: '실력 우선', hint: '팀 전력 차이를 가장 먼저 줄입니다. 접전 위주.' },
    { value: 'variety', label: '섞기 우선', hint: '같은 파트너·상대가 반복되지 않게 합니다.' },
]

/** 방 하나에 만들 수 있는 게임 수 상한 — 로테이션 finalize(MAX_GAMES)와 같은 값 */
export const ROOM_LINEUP_MAX_GAMES = 20

/**
 * 1인당 경기 수 선택지 — 드롭다운이라 항목이 늘어도 옵션 영역이 커지지 않는다.
 * 인원이 많으면 총 게임 수가 ROOM_LINEUP_MAX_GAMES에 먼저 걸리고, 그건 경고로 알린다.
 */
export const PER_PLAYER_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const

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
    /**
     * 동시에 도는 코트 면 수(기본 1). 2 이상이면 **한 라운드 안에서 같은 사람이 두 코트에 서지 않게** 뽑는다 —
     * 이 값이 없으면 게임 1과 게임 2에 같은 사람이 들어갈 수 있고, 그 둘을 나란히 그리면
     * 실행할 수 없는 대진이 된다.
     */
    courtCount?: number
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

/** 대진 한 자리 — 편집 중에는 아직 비어 있을 수 있다 */
export type LineupSlot = LineupPlayer | null

type SlottedGame = { team1: readonly LineupSlot[]; team2: readonly LineupSlot[] }

/**
 * 게임 배열에서 「쉼」과 출전 횟수를 다시 센다.
 *
 * 생성 루프 안에서 누적하지 않고 결과에서 되읽는 이유는 **편집** 때문이다 — 사람이 자리를 바꾸거나
 * 게임을 지운 뒤에도 같은 함수로 집계가 맞아야 한다. 생성 직후에는 commitLineup이 누적한 값과 동치다.
 */
export function summarizeLineup(
    games: readonly SlottedGame[],
    players: LineupPlayer[],
): { resting: string[][]; playCounts: Record<string, number> } {
    const playCounts: Record<string, number> = {}
    for (const p of players) playCounts[p.key] = 0

    const resting = games.map((g) => {
        const inGame = new Set([...g.team1, ...g.team2].filter((p): p is LineupPlayer => !!p).map((p) => p.key))
        for (const key of inGame) {
            if (key in playCounts) playCounts[key] += 1
        }
        return players.filter((p) => !inGame.has(p.key)).map((p) => p.key)
    })

    return { resting, playCounts }
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

    // 라운드 = 동시에 도는 한 묶음. 인원이 모자라면 면을 다 못 쓴다(11명으로 3면은 2면이 한계).
    // 표시 계층도 같은 함수로 라운드를 읽으므로 "화면은 2면인데 대진은 3면 기준"이 생기지 않는다.
    const courts = effectiveCourtCount(players.length, opts.matchType, opts.courtCount ?? 1)
    if (courts < (opts.courtCount ?? 1)) {
        warnings.push(`참가자 ${players.length}명으로는 한 번에 ${courts}면만 돌릴 수 있습니다.`)
    }
    // 같은 라운드에 이미 코트에 선 사람 — 클럽 격자(auto-generate.ts)가 라운드마다 available을
    // 리셋하고 지우는 것과 같은 장치다. 룸은 격자가 없으므로 Set 하나면 된다.
    const roundUsed = new Set<string>()

    const games: LineupGame[] = []
    for (let i = 0; i < count; i++) {
        if (i % courts === 0) roundUsed.clear()
        // 비용이 같은 후보들 사이에서만 흔들린다 — 품질은 유지되고 [다시 뽑기]가 실제로 다른 결과를 낸다
        const pool = shuffled(players.filter((p) => !roundUsed.has(p.key)), rng)
        const { mandatory, optional } = fairnessTier(pool, state.playCount, need.size)
        const picked = selectPlayers(opts.matchType, optional, state, lineupOptions, mandatory)
        if (!picked) {
            warnings.push(`${i + 1}번째 경기부터는 참가자 구성으로 대진을 만들 수 없어 중단했습니다.`)
            break
        }
        const teams = commitLineup(picked, opts.matchType, state, lineupOptions)
        for (const p of picked) roundUsed.add(p.key)
        games.push({ seq: games.length + 1, matchType: opts.matchType, team1: teams.team1, team2: teams.team2 })
    }

    if (games.some((g) => !isGenderMatched(g))) {
        warnings.push(`인원 구성상 일부 경기는 ${TYPE_LABEL[opts.matchType]} 성별 구성을 맞추지 못했습니다.`)
    }

    return { games, ...summarizeLineup(games, players), warnings }
}

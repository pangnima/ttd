// 자동 대진표 생성 — DB 접근 없는 순수 함수 모듈.
//
// 운영자가 지정한 코트(종류 고정) × 라운드 격자에, 참석자를 성별·NTRP 수준을 고려해
// 무작위가 아닌 규칙 기반으로 배치한다. 결과는 폼이 그대로 쓰는 SimpleMatchEntry[]로 반환되어
// 기존 검증(validateEntries) → buildMatchGamePayload → createMatchGameAction 경로를 탄다.
//
// 배치 규칙 자체(선발·팀 분할·비용)는 격자를 모르는 lineup-core.ts에 있다. 이 파일은 그 코어의
// **격자 어댑터**다 — User[] → LineupPlayer[] 변환, 라운드 루프, 라운드 내 국소 개선, 엔트리 변환.
// 클럽 대진표는 코어를 hard 성별 제약 + 균형 가중치 + 회원 제약 없음으로 쓴다(= 기존 동작).
//
// 설계 요약
//  - 비슷한 실력끼리 같은 코트(코트 내 NTRP 폭 최소화) + 코트 내부는 균형 팀
//  - 실력 균형 · 공평성(경기 수) · 다양성(파트너/상대 안 겹침)을 가중 비용으로 균형있게 반영
//  - NTRP 미입력/게스트(0)는 기본값(평점 보유자 평균, 없으면 3.0)으로 간주
//
// 향후 NTRP 레이팅 시스템이 도입되면 effectiveNtrp 입력만 교체하면 그대로 동작한다.

import type { CourtSurface, MatchType, User } from '@/types'
import { addMinutes, genId, type FormCourt, type SimpleMatchEntry } from '@/lib/match-games/form-mapping'
import {
    DEFAULT_LINEUP_WEIGHTS,
    commitLineup,
    createLineupState,
    groupCost,
    selectPlayers,
    splitTeams,
    type LineupOptions,
    type LineupPlayer,
    type LineupState,
} from '@/lib/match-games/lineup-core'

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
export const WEIGHTS = DEFAULT_LINEUP_WEIGHTS

/** 클럽 대진표의 코어 옵션 — 성별은 하드 제약이고, 회원/게스트 구분은 두지 않는다 */
const CLUB_LINEUP_OPTIONS: LineupOptions = {
    weights: WEIGHTS,
    genderMode: 'hard',
    requireMemberPerTeam: false,
}

const FALLBACK_NTRP = 3.0

/** 참석자 중 평점 보유자 평균. 없으면 3.0. */
export function computeDefaultNtrp(attendees: User[]): number {
    const rated = attendees.map((a) => a.ntrp).filter((n) => typeof n === 'number' && n > 0)
    if (rated.length === 0) return FALLBACK_NTRP
    return rated.reduce((sum, n) => sum + n, 0) / rated.length
}

/** 참석자 → 코어의 배치 대상. 평점 미보유는 기본값으로 채운다 */
function toLineupPlayer(user: User, defaultNtrp: number): LineupPlayer {
    return {
        key: user.id,
        name: user.name,
        ntrp: user.ntrp && user.ntrp > 0 ? user.ntrp : defaultNtrp,
        gender: user.gender,
        isMember: !user.isGuest,
    }
}

type CourtAssignment = { config: CourtConfig; players: LineupPlayer[] }

/** 라운드 내 같은 성별 선수 페어 스왑으로 코트 배치를 국소 개선. */
function improveRound(assignments: CourtAssignment[], state: LineupState): void {
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
                            groupCost(A.players, A.config.matchType, state, CLUB_LINEUP_OPTIONS) +
                            groupCost(B.players, B.config.matchType, state, CLUB_LINEUP_OPTIONS)
                        A.players[ai] = pb
                        B.players[bi] = pa
                        const after =
                            groupCost(A.players, A.config.matchType, state, CLUB_LINEUP_OPTIONS) +
                            groupCost(B.players, B.config.matchType, state, CLUB_LINEUP_OPTIONS)
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
function toEntry(assignment: CourtAssignment, startAt: string, endAt: string, state: LineupState): SimpleMatchEntry {
    const { config, players } = assignment
    const { team1, team2 } = splitTeams(players, config.matchType, state, CLUB_LINEUP_OPTIONS)
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
        base.player1Id = team1[0].key
        base.player2Id = team2[0].key
    } else {
        base.team1 = [team1[0].key, team1[1].key]
        base.team2 = [team2[0].key, team2[1].key]
    }
    return base
}

/** 종류가 빡빡할수록(성별 고정) 먼저 배정해 희소 성별을 유연한 단식에 빼앗기지 않게 한다. */
function tightnessRank(type: MatchType): number {
    if (type === 'men_doubles' || type === 'women_doubles') return 0
    if (type === 'mixed_doubles') return 1
    return 2 // singles
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
    const players = attendees.map((u) => toLineupPlayer(u, defaultNtrp))
    const state = createLineupState()

    const entries: SimpleMatchEntry[] = []
    // 빡빡한 종류(성별 고정) 코트를 먼저 배정하도록 정렬 (결과 entries는 원래 코트 순서로 정렬)
    const orderedCourts = [...courts].sort((a, b) => tightnessRank(a.matchType) - tightnessRank(b.matchType))

    for (let r = 0; r < rounds; r++) {
        const startAt = addMinutes(baseStart, r * slotMinutes)
        const endAt = addMinutes(startAt, slotMinutes)

        const available = new Map(players.map((p) => [p.key, p]))
        const assignments: CourtAssignment[] = []

        for (const court of orderedCourts) {
            const picked = selectPlayers(court.matchType, [...available.values()], state, CLUB_LINEUP_OPTIONS)
            if (!picked) {
                warnings.push(`${r + 1}라운드 ${court.label}(${TYPE_LABEL[court.matchType]}): 인원이 부족해 경기를 생성하지 못했습니다.`)
                continue
            }
            for (const p of picked) available.delete(p.key)
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
            commitLineup(assignment.players, assignment.config.matchType, state, CLUB_LINEUP_OPTIONS)
        }
    }

    return { courts: formCourts, entries, warnings }
}

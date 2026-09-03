// 개인 경기(personal_matches) 승패 기반 개인 레이팅 — 온더플라이 계산(영속화 없음).
// 클럽 ELO 엔진(elo.ts)의 스칼라 primitive를 그대로 재사용하되, 상대 레이팅은
// 풀(pool)에서 동적 조회하지 않고 경기별 추정치(+fallback)를 주입한다. docs/rating-system.md §9.
//
// 클럽 ELO와의 차이:
//   - '나' 한 명의 레이팅 시계열만 순차 재생한다(복식 파트너 강함은 무시).
//   - 상대(팀) 레이팅 = 저장 추정치 → 등록상대 ntrp → 본인 ntrp → 기본 2.5 순서로 결정.

import type { PersonalMatch } from '@/types'
import {
    expectedScore,
    pickK,
    marginFactor,
    computeMatchDelta,
    DEFAULT_RATING,
    MIN_RATING,
    MAX_RATING,
    PROVISIONAL_THRESHOLD,
} from './elo'

// 트렌드 카드(ClubRatingTrendCard 패턴)의 RatingHistoryPoint와 구조 호환.
export type PersonalRatingPoint = {
    matchId: string
    createdAt: string // playedAt (정렬·표시용)
    ratingBefore: number
    ratingAfter: number
    delta: number
    oppRating: number // 적용된 상대 레이팅 (디버깅/표시 선택)
}

export type PersonalRatingSnapshot = {
    rating: number
    matchesPlayed: number
    provisional: boolean
    history: PersonalRatingPoint[]
}

/** 회원 id → 자가선언 ntrp 조회. 값이 없거나 0 이하(미설정)면 undefined로 취급한다. */
export type OppNtrpResolver = (userId: string) => number | null | undefined

function clampRating(r: number): number {
    return Math.min(Math.max(r, MIN_RATING), MAX_RATING)
}

/** 0 이하/비정상 값은 미설정으로 간주 (mapUserRow가 미설정 ntrp를 0으로 채우므로). */
function usableNtrp(n: number | null | undefined): number | null {
    return typeof n === 'number' && n > 0 ? n : null
}

const DOUBLES_TYPES: PersonalMatch['matchType'][] = ['men_doubles', 'women_doubles', 'mixed_doubles']
function isDoublesMatch(m: PersonalMatch): boolean {
    return DOUBLES_TYPES.includes(m.matchType)
}

function avg(nums: number[]): number {
    return nums.reduce((s, n) => s + n, 0) / nums.length
}

/**
 * 한 경기의 상대(팀) 레이팅을 fallback 체인으로 결정한다.
 * ① 저장된 NTRP(복식은 상대1·2 평균) → ② 등록 상대 ntrp(복식은 상대1·2 평균) → ③ 본인 ntrp(동급 가정) → ④ 기본 2.5.
 */
export function resolveOpponentRating(
    m: PersonalMatch,
    selfNtrp: number | null,
    oppNtrpById: OppNtrpResolver,
): number {
    // ① 저장된 추정치 (복식이면 상대1·2 평균, 있는 값만)
    const storedOpps = [
        usableNtrp(m.opponentNtrp),
        isDoublesMatch(m) ? usableNtrp(m.opponent2Ntrp) : null,
    ].filter((n): n is number => n !== null)
    if (storedOpps.length > 0) return avg(storedOpps)

    // ② 등록 상대 ntrp (복식은 상대1·2 평균, 둘 중 하나만 있으면 그 값)
    const ids = [m.opponentUserId, m.opponent2UserId].filter((id): id is string => !!id)
    const known = ids
        .map((id) => usableNtrp(oppNtrpById(id)))
        .filter((n): n is number => n !== null)
    if (known.length > 0) {
        return avg(known)
    }

    // ③ 본인 ntrp (동급 가정) → ④ 기본값
    return usableNtrp(selfNtrp) ?? DEFAULT_RATING
}

/**
 * 복식에서 '내 팀' 사이드 레이팅을 결정한다(기대승률 계산용).
 * 단식은 내 현재 레이팅 그대로, 복식은 avg(내 레이팅, 파트너 강도).
 * 파트너 강도 fallback: ① 저장된 partnerNtrp → ② 파트너 회원 ntrp → ③ 내 레이팅(동급=무영향).
 */
export function resolveSelfSideRating(
    m: PersonalMatch,
    currentRating: number,
    partnerNtrpById: OppNtrpResolver,
): number {
    if (!isDoublesMatch(m)) return currentRating
    const memberNtrp = m.partnerUserId ? partnerNtrpById(m.partnerUserId) : undefined
    const partnerStrength = usableNtrp(m.partnerNtrp) ?? usableNtrp(memberNtrp) ?? currentRating
    return (currentRating + partnerStrength) / 2
}

/** winner('me'|'opponent'|'draw') → '나' 입장의 스코어(승1/패0/무0.5). null(미확정)은 호출 전에 걸러진다. */
function selfScoreOf(winner: PersonalMatch['winner']): number {
    if (winner === 'me') return 1
    if (winner === 'opponent') return 0
    return 0.5
}

/**
 * 개인 경기들을 시간순으로 재생해 '나'의 레이팅 시계열을 산출한다.
 * 결정적: 동일 입력 → 동일 스냅샷. fetch는 played_at desc이므로 내부에서 asc 재정렬한다.
 *
 * @param matches 본인의 개인 경기들 (정렬 무관 — 내부에서 (playedAt, playedTime, id) asc 재정렬)
 * @param selfNtrp 본인 자가선언 ntrp (시작 레이팅 + fallback③). 0/null이면 기본 2.5에서 시작.
 * @param oppNtrpById 회원 ntrp 조회기 (fallback②)
 */
export function replayPersonalRatings(
    matches: PersonalMatch[],
    selfNtrp: number | null,
    oppNtrpById: OppNtrpResolver,
): PersonalRatingSnapshot {
    const start = usableNtrp(selfNtrp) ?? DEFAULT_RATING

    // 시간순(과거→최신) 정렬. 같은 일시의 로테이션 게임은 세션 내 순번(groupSeq, 실제 입력 순)으로,
    // 그래도 같으면 id로 안정 정렬해 결정성을 보장한다.
    const sorted = [...matches].sort((a, b) => {
        const d = a.playedAt.localeCompare(b.playedAt)
        if (d !== 0) return d
        const t = (a.playedTime ?? '').localeCompare(b.playedTime ?? '')
        if (t !== 0) return t
        const s = (a.groupSeq ?? 0) - (b.groupSeq ?? 0)
        if (s !== 0) return s
        return a.id.localeCompare(b.id)
    })

    let rating = start
    let matchesPlayed = 0
    const history: PersonalRatingPoint[] = []

    for (const m of sorted) {
        if (!m.winner) continue  // 결과 미확정은 레이팅에 반영하지 않는다 (explode에서 이미 제외되지만 이중 방어)
        const oppRating = resolveOpponentRating(m, selfNtrp, oppNtrpById)
        const selfScore = selfScoreOf(m.winner)
        // marginFactor는 {team1, team2} 세트 형식을 받는다 — 나=team1, 상대=team2로 매핑.
        const sets = m.setScores.map((s) => ({ team1: s.me, team2: s.opp }))
        const winnerSide = m.winner === 'me' ? 'team1' : m.winner === 'opponent' ? 'team2' : 'draw'
        const margin = marginFactor(sets, winnerSide)
        const k = pickK(matchesPlayed)

        const before = rating
        // 복식은 파트너 강도를 블렌드한 '내 팀' 사이드 레이팅으로 기대승률을 계산한다.
        // delta는 팀이 아니라 내 개인 레이팅(before)에 적용한다.
        const selfSide = resolveSelfSideRating(m, before, oppNtrpById)
        const delta = computeMatchDelta({ selfRating: selfSide, oppRating, selfScore, k, margin })
        const after = clampRating(before + delta)

        rating = after
        matchesPlayed += 1
        history.push({
            matchId: m.id,
            createdAt: m.playedAt,
            ratingBefore: before,
            ratingAfter: after,
            delta: after - before,
            oppRating,
        })
    }

    return {
        rating,
        matchesPlayed,
        provisional: matchesPlayed < PROVISIONAL_THRESHOLD,
        history,
    }
}

// expectedScore는 직접 쓰지 않지만 테스트/디버깅 편의를 위해 재노출.
export { expectedScore }

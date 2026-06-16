// 대진표 "특별 매치" 판정 — DB 접근 없는 순수 함수.
//  - 명승부(close): 한 경기 스코어만으로 박빙 여부 판정 (클라이언트 계산).
//  - 라이벌(rival): 클럽 확정 경기 누적 cross-pair 전적으로 박빙 라이벌 관계 판정 (서버 집계).
import type { Match } from '@/types'
import type { SetScore } from '@/components/match-games/match-game-cell-components'
import type { WinnerSide } from '@/lib/match-games/match-view-helpers'

// ── 명승부(접전) ────────────────────────────────

// 접전 판정 임계값: 게임차 ≤ CLOSE_MARGIN 이고 패측 게임수 ≥ CLOSE_MIN_LOSER.
// 예) 6-4·7-5·7-6 = 접전, 6-1·6-0 = 일방적.
const CLOSE_MARGIN = 2
const CLOSE_MIN_LOSER = 5

// 확정된 경기 스코어가 접전(명승부)인지. winner가 null(미입력)·'draw'면 false.
export function isCloseMatch(sets: SetScore[], winner: WinnerSide): boolean {
    if (winner !== 'team1' && winner !== 'team2') return false
    let t1 = 0
    let t2 = 0
    let hasInput = false
    for (const s of sets) {
        const a = parseInt(s.team1)
        const b = parseInt(s.team2)
        if (!Number.isNaN(a) || !Number.isNaN(b)) hasInput = true
        t1 += Number.isNaN(a) ? 0 : a
        t2 += Number.isNaN(b) ? 0 : b
    }
    if (!hasInput) return false
    const margin = Math.abs(t1 - t2)
    const loser = Math.min(t1, t2)
    return margin <= CLOSE_MARGIN && loser >= CLOSE_MIN_LOSER
}

// ── 라이벌 (cross-pair 누적 전적) ────────────────────────────────

// 두 선수 한 쌍의 누적 맞대결 전적. a/b는 pairKey 정렬 순서.
export type PairRecord = { aWins: number; bWins: number; draws: number }
export type CrossPairH2H = Map<string, PairRecord>

// 정렬된 두 id로 무방향 쌍 키 생성 (a-b == b-a).
export function pairKey(id1: string, id2: string): string {
    return id1 < id2 ? `${id1}__${id2}` : `${id2}__${id1}`
}

// 경기의 양 사이드 선수 id (단식: player1/2, 복식: team1/2).
function sidePlayerIds(m: Match): { side1: string[]; side2: string[] } {
    const side1 = m.matchType === 'singles'
        ? [m.player1Id].filter((id): id is string => Boolean(id))
        : (m.team1 ?? []).filter(Boolean)
    const side2 = m.matchType === 'singles'
        ? [m.player2Id].filter((id): id is string => Boolean(id))
        : (m.team2 ?? []).filter(Boolean)
    return { side1, side2 }
}

// 클럽 확정 경기들에서 cross-pair(서로 반대편) 누적 전적 집계.
// 복식은 side1 × side2 모든 쌍에 동일 승패를 부여한다. 같은 팀끼리는 집계하지 않는다.
export function buildCrossPairH2H(matches: Match[]): CrossPairH2H {
    const map: CrossPairH2H = new Map()
    for (const m of matches) {
        if (!m.result) continue
        const { side1, side2 } = sidePlayerIds(m)
        if (!side1.length || !side2.length) continue
        const winner = m.result.winnerId
        for (const p1 of side1) {
            for (const p2 of side2) {
                if (p1 === p2) continue
                const key = pairKey(p1, p2)
                const rec = map.get(key) ?? { aWins: 0, bWins: 0, draws: 0 }
                // pairKey 정렬에서 p1이 'a'쪽인지 판정해 승수 귀속.
                const p1IsA = p1 < p2
                if (winner === 'draw') rec.draws += 1
                else if ((winner === 'team1') === p1IsA) rec.aWins += 1
                else rec.bWins += 1
                map.set(key, rec)
            }
        }
    }
    return map
}

// 한 쌍이 라이벌인지: 맞대결 3경기 이상 + 승률 45~55% 박빙.
// selectRivals(lib/analytics/rival.ts)의 minGames=3·45~55% 기준과 정합.
export function isRivalPair(rec: PairRecord): boolean {
    const total = rec.aWins + rec.bWins + rec.draws
    if (total < 3) return false
    const decisive = rec.aWins + rec.bWins
    if (decisive === 0) return false
    const winRate = Math.round((rec.aWins / decisive) * 100)
    return winRate >= 45 && winRate <= 55
}

// 현재 경기의 cross 쌍 중 하나라도 라이벌 관계면 그 경기를 라이벌로 표시.
export function isRivalMatch(m: Match, h2h: CrossPairH2H): boolean {
    const { side1, side2 } = sidePlayerIds(m)
    for (const p1 of side1) {
        for (const p2 of side2) {
            if (p1 === p2) continue
            const rec = h2h.get(pairKey(p1, p2))
            if (rec && isRivalPair(rec)) return true
        }
    }
    return false
}

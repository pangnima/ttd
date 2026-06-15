import {
    type BundleWithMatches, type BundleWithGameMeta, type BundleWithPersonal,
    getMatchOutcome, calcWinRate,
} from '@/lib/analytics/shared'
import { isValidDate, isoWeekday, yearOf, weekOfYear, WEEKDAY_LABELS } from '@/lib/analytics/date-utils'

// ── 승률 추이 (연도 스코프 · 일간/주간/월간 공용) ─────────────────────────
// 한 해(year) 안에서 주기별로 누적한다.
//   일간 = 요일별(월~일, 7칸 고정)
//   주간 = 연중 주차별(1주 ~ 관측 최대 주차)
//   월간 = 월별(1월 ~ 12월, 12칸 고정)

export type TrendPoint = {
    key: string          // 버킷 키 (요일 인덱스/주차/월 등 문자열)
    label: string        // '월'..'일' | 'N주' | 'M월'
    total: number
    wins: number
    losses: number
    draws: number
    winRate: number      // decisive 기준, 0경기 0
}

export type TrendStatsResult = {
    points: TrendPoint[]   // 주기 순서(과거→최신)
    maxTotal: number
    totalGames: number
    bestPoint: TrendPoint | null
}

type Acc = { wins: number; losses: number; draws: number; total: number }
type TimeBundle = BundleWithMatches & BundleWithGameMeta & BundleWithPersonal

// 클럽 매치 날짜는 gameMetaById에서, 개인 경기는 playedAt에서 해석해 (날짜, 승패)를 순회한다.
function forEachOutcome(
    bundle: TimeBundle,
    userId: string,
    fn: (dateStr: string, outcome: 'win' | 'loss' | 'draw') => void,
) {
    for (const m of bundle.matches) {
        if (!m.result) continue
        fn(bundle.gameMetaById[m.matchGameId]?.date ?? '0000-00-00', getMatchOutcome(m, userId))
    }
    for (const pm of bundle.personalMatches) {
        fn(pm.playedAt, pm.winner === 'me' ? 'win' : pm.winner === 'opponent' ? 'loss' : 'draw')
    }
}

// 지정 연도의 경기만 keyFn(날짜→버킷키)으로 묶는다.
function bucketize(
    bundle: TimeBundle,
    userId: string,
    year: number,
    keyFn: (d: string) => string,
): Map<string, Acc> {
    const buckets = new Map<string, Acc>()
    forEachOutcome(bundle, userId, (dateStr, outcome) => {
        if (!isValidDate(dateStr) || yearOf(dateStr) !== year) return
        const key = keyFn(dateStr)
        const acc = buckets.get(key) ?? { wins: 0, losses: 0, draws: 0, total: 0 }
        acc.total++
        if (outcome === 'win') acc.wins++
        else if (outcome === 'loss') acc.losses++
        else acc.draws++
        buckets.set(key, acc)
    })
    return buckets
}

// 고정 도메인 키 배열(과거→최신, 빈 구간 포함) + 라벨 함수로 결과 조립
function buildResult(
    buckets: Map<string, Acc>,
    keys: string[],
    labelFn: (key: string) => string,
): TrendStatsResult {
    const points: TrendPoint[] = keys.map((key) => {
        const acc = buckets.get(key) ?? { wins: 0, losses: 0, draws: 0, total: 0 }
        return {
            key,
            label: labelFn(key),
            total: acc.total,
            wins: acc.wins,
            losses: acc.losses,
            draws: acc.draws,
            winRate: calcWinRate(acc.wins, acc.losses),
        }
    })
    const maxTotal = points.reduce((mx, p) => Math.max(mx, p.total), 0)
    const totalGames = points.reduce((sum, p) => sum + p.total, 0)
    const bestPoint = points
        .filter((p) => p.wins + p.losses > 0)
        .reduce<TrendPoint | null>((best, p) => (best && best.winRate >= p.winRate ? best : p), null)
    return { points, maxTotal, totalGames, bestPoint }
}

/** 경기 데이터가 존재하는 연도 목록 (내림차순). 셀렉트박스·카드용. */
export function listMatchYears(bundle: TimeBundle, userId: string): number[] {
    const years = new Set<number>()
    forEachOutcome(bundle, userId, (dateStr) => {
        if (isValidDate(dateStr)) years.add(yearOf(dateStr))
    })
    return [...years].sort((a, b) => b - a)
}

/** 일간 = 요일별(월~일). 항상 7포인트, 빈 요일 0. */
export function aggregateWeekdayStats(bundle: TimeBundle, userId: string, year: number): TrendStatsResult {
    const buckets = bucketize(bundle, userId, year, (d) => String(isoWeekday(d)))
    const keys = ['0', '1', '2', '3', '4', '5', '6']
    return buildResult(buckets, keys, (k) => WEEKDAY_LABELS[Number(k)])
}

/** 주간 = 연중 주차별. 1주 ~ 관측 최대 주차, 빈 주 0. */
export function aggregateWeekOfYearStats(bundle: TimeBundle, userId: string, year: number): TrendStatsResult {
    const buckets = bucketize(bundle, userId, year, (d) => String(weekOfYear(d)))
    const maxWeek = [...buckets.keys()].reduce((mx, k) => Math.max(mx, Number(k)), 0)
    if (maxWeek === 0) return EMPTY
    const keys = Array.from({ length: maxWeek }, (_, i) => String(i + 1))
    return buildResult(buckets, keys, (k) => `${k}주`)
}

/** 월간 = 월별. 항상 1~12월, 빈 달 0. */
export function aggregateMonthOfYearStats(bundle: TimeBundle, userId: string, year: number): TrendStatsResult {
    const buckets = bucketize(bundle, userId, year, (d) => String(Number(d.slice(5, 7))))
    const keys = Array.from({ length: 12 }, (_, i) => String(i + 1))
    return buildResult(buckets, keys, (k) => `${k}월`)
}

const EMPTY: TrendStatsResult = { points: [], maxTotal: 0, totalGames: 0, bestPoint: null }

// 'YYYY-MM-DD' 문자열 전용 날짜 유틸 (타임존 안전).
// 로컬 new Date('YYYY-MM-DD')는 브라우저/서버 타임존에 따라 하루 밀릴 수 있어 금지.
// 항상 Date.UTC로 분해/조립하고, 비교는 사전식 문자열로 처리한다.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MS_PER_DAY = 86_400_000

/** 유효한 'YYYY-MM-DD'인지 ('0000-00-00' 플레이스홀더 제외). */
export function isValidDate(dateStr: string): boolean {
    if (!DATE_RE.test(dateStr)) return false
    return dateStr !== '0000-00-00'
}

/** 'YYYY-MM-DD' → 'YYYY-MM'. */
export function monthKey(dateStr: string): string {
    return dateStr.slice(0, 7)
}

/** 'YYYY-MM-DD' → UTC 자정 Date. */
export function parseUTC(dateStr: string): Date {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d))
}

/** UTC Date → 'YYYY-MM-DD'. */
export function formatUTC(d: Date): string {
    return d.toISOString().slice(0, 10)
}

/** 'YYYY-MM-DD'에 n일 더한 'YYYY-MM-DD' (음수 가능). */
export function addDaysStr(dateStr: string, n: number): string {
    const d = parseUTC(dateStr)
    d.setUTCDate(d.getUTCDate() + n)
    return formatUTC(d)
}

/** 'YYYY-MM'에 n개월 더한 'YYYY-MM' (음수 가능). */
export function addMonthsKey(ym: string, n: number): string {
    const [y, m] = ym.split('-').map(Number)
    const total = (y * 12 + (m - 1)) + n
    const ny = Math.floor(total / 12)
    const nm = total % 12
    return `${String(ny).padStart(4, '0')}-${String(nm + 1).padStart(2, '0')}`
}

/** 요일 인덱스 (0=월 … 6=일). */
export function isoWeekday(dateStr: string): number {
    return (parseUTC(dateStr).getUTCDay() + 6) % 7
}

/** 'YYYY-MM-DD' → 연도(number). */
export function yearOf(dateStr: string): number {
    return Number(dateStr.slice(0, 4))
}

/** 그 해 1월 1일을 1로 한 일련번호 (1..366). */
export function dayOfYear(dateStr: string): number {
    return diffDays(dateStr, `${yearOf(dateStr)}-01-01`) + 1
}

/**
 * 연중 주차 (1..53). 1월 1~7일=1주, 8~14일=2주 … 단순 7일 분할.
 * ISO 8601 엄밀판이 아니라 '해당 연도 안에서 몇 번째 주'를 직관적으로 매긴다.
 */
export function weekOfYear(dateStr: string): number {
    return Math.ceil(dayOfYear(dateStr) / 7)
}

/** 해당 날짜가 속한 주의 월요일 'YYYY-MM-DD'. */
export function mondayOf(dateStr: string): string {
    return addDaysStr(dateStr, -isoWeekday(dateStr))
}

/** a - b 일수 차 (양수면 a가 미래). */
export function diffDays(a: string, b: string): number {
    return Math.round((parseUTC(a).getTime() - parseUTC(b).getTime()) / MS_PER_DAY)
}

/**
 * today 기준 상대 일자 라벨.
 * 0→'오늘', 1→'어제', <7→'n일 전', <30→'n주 전', 그 외 'M월 D일'.
 * 미래 날짜(음수 차)는 'M월 D일'로 폴백.
 */
export function relativeDayLabel(dateStr: string, today: string): string {
    const d = diffDays(today, dateStr)
    if (d < 0) return absoluteLabel(dateStr)
    if (d === 0) return '오늘'
    if (d === 1) return '어제'
    if (d < 7) return `${d}일 전`
    if (d < 30) return `${Math.floor(d / 7)}주 전`
    return absoluteLabel(dateStr)
}

function absoluteLabel(dateStr: string): string {
    const d = parseUTC(dateStr)
    return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`
}

/** 요일 라벨 (0=월 … 6=일). */
export const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'] as const

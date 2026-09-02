/**
 * 년/월 입력 파서·포맷 — 테니스 시작일처럼 "월 단위"만 의미 있는 날짜에 사용.
 * DB에는 date 컬럼에 'YYYY-MM-01'로 정규화 저장하고, 표시는 문자열 기반으로 TZ 영향을 받지 않게 한다.
 * (lib/format.ts의 formatYearMonth는 new Date() 로컬 TZ 변환이라 'YYYY-MM-01'에 쓰면 전월로 밀릴 수 있음)
 */

export type YearMonth = { year: number; month: number }

/** 허용 하한 연도 — 이보다 이른 시작일은 오타로 간주 */
export const YEAR_MONTH_MIN_YEAR = 1950

// 허용 형태: 2025/07, 2022/2, 2025-7, 2025.07, 202507, 2025년 7월, 2025년 7 (구분자 앞뒤 공백 허용)
const SEPARATED = /^(\d{4})\s*[/\-.]\s*(\d{1,2})$/
const COMPACT = /^(\d{4})(\d{2})$/
const KOREAN = /^(\d{4})\s*년\s*(\d{1,2})\s*월?$/

/**
 * 자유 입력 문자열을 {year, month}로 파싱. 형식 불일치·범위 밖(1950 미만, 미래 월, 13월 등)이면 null.
 * now를 주입해 "미래 월" 판정을 테스트에서 고정할 수 있다.
 */
export function parseYearMonth(input: string, now: Date = new Date()): YearMonth | null {
    const trimmed = input.trim()
    if (!trimmed) return null
    const m = SEPARATED.exec(trimmed) ?? COMPACT.exec(trimmed) ?? KOREAN.exec(trimmed)
    if (!m) return null

    const year = Number(m[1])
    const month = Number(m[2])
    if (month < 1 || month > 12) return null
    if (year < YEAR_MONTH_MIN_YEAR) return null

    const nowYear = now.getFullYear()
    const nowMonth = now.getMonth() + 1
    if (year > nowYear || (year === nowYear && month > nowMonth)) return null

    return { year, month }
}

/** {year, month} → date 컬럼 저장용 'YYYY-MM-01' */
export function toStartDateString({ year, month }: YearMonth): string {
    return `${year}-${String(month).padStart(2, '0')}-01`
}

/** 'YYYY-MM-DD' → '2022년 7월' (문자열 분해, TZ 무관). 형식이 다르면 원문 반환 */
export function formatYearMonthLabel(dateStr: string): string {
    const m = /^(\d{4})-(\d{2})/.exec(dateStr)
    if (!m) return dateStr
    return `${m[1]}년 ${Number(m[2])}월`
}

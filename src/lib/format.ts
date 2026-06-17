/**
 * 날짜·시간 포맷 공용 헬퍼.
 * 여러 컴포넌트에서 중복 정의되던 포맷 함수를 단일화.
 */

/** ISO 문자열을 "방금 전 / N분 전 / N시간 전 / N일 전" 상대 시간으로 변환 */
export function formatRelativeTime(isoString: string): string {
    const diffMs = Date.now() - new Date(isoString).getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return '방금 전'
    if (diffMin < 60) return `${diffMin}분 전`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `${diffH}시간 전`
    return `${Math.floor(diffH / 24)}일 전`
}

/** "6월 5일" 형식 (월/일) */
export function formatShortDate(dateStr: string): string {
    return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(new Date(dateStr))
}

/** "2026년 6월" 형식 (연/월) */
export function formatYearMonth(dateStr: string): string {
    return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long' }).format(new Date(dateStr))
}

/**
 * "HH:MM" 시각을 30분 단위로 반올림한다. (예: "06:17" → "06:30", "06:44" → "06:30", "06:45" → "07:00")
 * 빈 문자열·형식 불일치는 그대로 반환. 24:00을 넘으면 23:30으로 고정(같은 날 유지).
 */
export function roundToHalfHour(value: string): string {
    const m = /^(\d{1,2}):(\d{2})$/.exec(value)
    if (!m) return value
    const h = Number(m[1])
    const min = Number(m[2])
    if (h > 23 || min > 59) return value
    const total = Math.round((h * 60 + min) / 30) * 30
    const clamped = Math.min(total, 23 * 60 + 30)
    const hh = String(Math.floor(clamped / 60)).padStart(2, '0')
    const mm = String(clamped % 60).padStart(2, '0')
    return `${hh}:${mm}`
}

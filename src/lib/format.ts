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

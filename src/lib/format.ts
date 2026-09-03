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

// ── 경기 시각(시 단위) ──
// 개인 경기 시각은 시(hour)만 받는다. 저장 포맷은 기존과 같은 'HH:MM'(분은 항상 00)이라 DB time 컬럼·검증 정규식은 그대로.

/** 경기 시각 select 옵션 — 값 'HH:00', 라벨 'N시' (00시~23시) */
export const HOUR_OPTIONS: { value: string; label: string }[] = Array.from({ length: 24 }, (_, h) => ({
    value: `${String(h).padStart(2, '0')}:00`,
    label: `${h}시`,
}))

/**
 * 'HH:MM' → 'HH:00' (분 절삭). 시 단위 도입 이전에 저장된 'HH:30' 값을 편집 폼 select에 맞추기 위한 정규화.
 * 빈 문자열·형식 불일치는 그대로 반환.
 */
export function toHourValue(value: string): string {
    const m = /^(\d{2}):\d{2}$/.exec(value)
    if (!m || Number(m[1]) > 23) return value
    return `${m[1]}:00`
}

/** 'HH:MM' → 'N시' 표시 라벨 (예: '18:00' → '18시', '06:30' → '6시'). 형식 불일치는 그대로 반환. */
export function formatHourLabel(value: string): string {
    const m = /^(\d{2}):\d{2}$/.exec(value)
    if (!m || Number(m[1]) > 23) return value
    return `${Number(m[1])}시`
}

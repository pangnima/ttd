import { describe, it, expect } from 'vitest'
import { parseYearMonth, toStartDateString, formatYearMonthLabel } from './year-month'

// 미래 월 판정 고정: 2026년 9월
const NOW = new Date(2026, 8, 15)

describe('parseYearMonth', () => {
    it.each([
        ['2025/07', 2025, 7],
        ['2022/2', 2022, 2],
        ['2025-7', 2025, 7],
        ['2025.07', 2025, 7],
        ['202507', 2025, 7],
        [' 2025 / 7 ', 2025, 7],
        ['2025년 7월', 2025, 7],
        ['2025년7', 2025, 7],
    ])('%s → %i년 %i월', (input, year, month) => {
        expect(parseYearMonth(input, NOW)).toEqual({ year, month })
    })

    it('경계: 하한 연도·현재 월은 허용', () => {
        expect(parseYearMonth('1950/1', NOW)).toEqual({ year: 1950, month: 1 })
        expect(parseYearMonth('2026/9', NOW)).toEqual({ year: 2026, month: 9 })
    })

    it.each([
        ['', '빈 문자열'],
        ['abc', '문자'],
        ['25/07', '2자리 연도'],
        ['2022/007', '3자리 월'],
        ['2025/13', '13월'],
        ['2025/0', '0월'],
        ['1949/12', '하한 미만'],
        ['2026/10', '다음 달(미래)'],
        ['2027/1', '내년(미래)'],
        ['2025/07/01', '일 포함'],
    ])('%s 거부 (%s)', (input) => {
        expect(parseYearMonth(input, NOW)).toBeNull()
    })
})

describe('toStartDateString', () => {
    it('월을 2자리로 패딩하고 1일로 고정한다', () => {
        expect(toStartDateString({ year: 2022, month: 2 })).toBe('2022-02-01')
        expect(toStartDateString({ year: 2025, month: 12 })).toBe('2025-12-01')
    })
})

describe('formatYearMonthLabel', () => {
    it('YYYY-MM-DD → N년 M월 (선행 0 제거)', () => {
        expect(formatYearMonthLabel('2022-07-01')).toBe('2022년 7월')
        expect(formatYearMonthLabel('2025-12-01')).toBe('2025년 12월')
    })

    it('형식이 다르면 원문 반환', () => {
        expect(formatYearMonthLabel('미입력')).toBe('미입력')
    })

    it('파서 → 저장 문자열 → 라벨 왕복', () => {
        const parsed = parseYearMonth('2022/2', NOW)
        expect(parsed).not.toBeNull()
        expect(formatYearMonthLabel(toStartDateString(parsed!))).toBe('2022년 2월')
    })
})

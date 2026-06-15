import { describe, expect, it } from 'vitest'
import {
    isValidDate, monthKey, addDaysStr, addMonthsKey,
    isoWeekday, mondayOf, diffDays, relativeDayLabel,
    yearOf, dayOfYear, weekOfYear,
} from './date-utils'

describe('isValidDate', () => {
    it('정상 날짜는 true, 플레이스홀더·형식오류는 false', () => {
        expect(isValidDate('2026-06-15')).toBe(true)
        expect(isValidDate('0000-00-00')).toBe(false)
        expect(isValidDate('2026-6-15')).toBe(false)
        expect(isValidDate('')).toBe(false)
    })
})

describe('monthKey', () => {
    it("'YYYY-MM-DD' → 'YYYY-MM'", () => {
        expect(monthKey('2026-06-15')).toBe('2026-06')
    })
})

describe('addDaysStr / 월·연 경계', () => {
    it('월 경계를 넘는다', () => {
        expect(addDaysStr('2026-01-31', 1)).toBe('2026-02-01')
    })
    it('연 경계를 넘는다 (음수)', () => {
        expect(addDaysStr('2026-01-01', -1)).toBe('2025-12-31')
    })
})

describe('addMonthsKey', () => {
    it('연 경계를 넘는다', () => {
        expect(addMonthsKey('2026-01', -1)).toBe('2025-12')
        expect(addMonthsKey('2026-11', 2)).toBe('2027-01')
    })
})

describe('isoWeekday (0=월..6=일)', () => {
    it('2026-06-15는 월요일(0)', () => {
        expect(isoWeekday('2026-06-15')).toBe(0)
    })
    it('2026-06-21은 일요일(6)', () => {
        expect(isoWeekday('2026-06-21')).toBe(6)
    })
})

describe('mondayOf', () => {
    it('주중/주말 모두 같은 주 월요일 반환', () => {
        expect(mondayOf('2026-06-17')).toBe('2026-06-15') // 수 → 월
        expect(mondayOf('2026-06-21')).toBe('2026-06-15') // 일 → 월
        expect(mondayOf('2026-06-15')).toBe('2026-06-15') // 월 → 자기자신
    })
})

describe('diffDays', () => {
    it('일수 차 (양수=미래)', () => {
        expect(diffDays('2026-06-15', '2026-06-10')).toBe(5)
        expect(diffDays('2026-06-10', '2026-06-15')).toBe(-5)
    })
})

describe('yearOf', () => {
    it("'YYYY-MM-DD' → 연도", () => {
        expect(yearOf('2026-06-15')).toBe(2026)
        expect(yearOf('2024-01-01')).toBe(2024)
    })
})

describe('dayOfYear', () => {
    it('1월 1일은 1, 1월 8일은 8', () => {
        expect(dayOfYear('2026-01-01')).toBe(1)
        expect(dayOfYear('2026-01-08')).toBe(8)
    })
    it('12월 31일 (비윤년=365, 윤년=366)', () => {
        expect(dayOfYear('2026-12-31')).toBe(365)
        expect(dayOfYear('2024-12-31')).toBe(366) // 2024는 윤년
    })
})

describe('weekOfYear', () => {
    it('1~7일=1주, 8~14일=2주, 15일=3주', () => {
        expect(weekOfYear('2026-01-01')).toBe(1)
        expect(weekOfYear('2026-01-07')).toBe(1)
        expect(weekOfYear('2026-01-08')).toBe(2)
        expect(weekOfYear('2026-01-15')).toBe(3)
    })
    it('연말은 53주', () => {
        expect(weekOfYear('2026-12-31')).toBe(53)
    })
})

describe('relativeDayLabel', () => {
    const today = '2026-06-15'
    it('경계값', () => {
        expect(relativeDayLabel('2026-06-15', today)).toBe('오늘')
        expect(relativeDayLabel('2026-06-14', today)).toBe('어제')
        expect(relativeDayLabel('2026-06-12', today)).toBe('3일 전')
        expect(relativeDayLabel('2026-06-08', today)).toBe('1주 전')
        expect(relativeDayLabel('2026-05-01', today)).toBe('5월 1일')
    })
    it('미래 날짜는 절대 라벨로 폴백', () => {
        expect(relativeDayLabel('2026-06-20', today)).toBe('6월 20일')
    })
})

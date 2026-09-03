import { describe, expect, it } from 'vitest'
import { HOUR_OPTIONS, formatHourLabel, toHourValue } from './format'

describe('HOUR_OPTIONS', () => {
    it('00시~23시 24개, 값은 HH:00', () => {
        expect(HOUR_OPTIONS).toHaveLength(24)
        expect(HOUR_OPTIONS[0]).toEqual({ value: '00:00', label: '0시' })
        expect(HOUR_OPTIONS[23]).toEqual({ value: '23:00', label: '23시' })
    })
})

describe('toHourValue', () => {
    it('분을 절삭해 HH:00으로 만든다', () => {
        expect(toHourValue('06:30')).toBe('06:00')
        expect(toHourValue('18:00')).toBe('18:00')
        expect(toHourValue('23:59')).toBe('23:00')
    })

    it('빈 문자열·형식 불일치·범위 밖은 그대로 반환한다', () => {
        expect(toHourValue('')).toBe('')
        expect(toHourValue('abc')).toBe('abc')
        expect(toHourValue('6:30')).toBe('6:30')
        expect(toHourValue('25:00')).toBe('25:00')
    })
})

describe('formatHourLabel', () => {
    it('N시 라벨로 바꾼다 (앞자리 0 제거)', () => {
        expect(formatHourLabel('18:00')).toBe('18시')
        expect(formatHourLabel('06:30')).toBe('6시')
        expect(formatHourLabel('00:00')).toBe('0시')
    })

    it('형식 불일치는 그대로 반환한다', () => {
        expect(formatHourLabel('')).toBe('')
        expect(formatHourLabel('abc')).toBe('abc')
    })
})

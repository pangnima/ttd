import { describe, expect, it } from 'vitest'
import { roundToHalfHour } from './format'

describe('roundToHalfHour', () => {
    it('이미 30분 단위면 그대로 둔다', () => {
        expect(roundToHalfHour('06:00')).toBe('06:00')
        expect(roundToHalfHour('06:30')).toBe('06:30')
    })

    it('가까운 30분으로 반올림한다', () => {
        expect(roundToHalfHour('06:14')).toBe('06:00')
        expect(roundToHalfHour('06:15')).toBe('06:30')
        expect(roundToHalfHour('06:44')).toBe('06:30')
        expect(roundToHalfHour('06:45')).toBe('07:00')
    })

    it('자정 근처를 23:30으로 고정한다(같은 날 유지)', () => {
        expect(roundToHalfHour('23:45')).toBe('23:30')
        expect(roundToHalfHour('23:59')).toBe('23:30')
    })

    it('빈 문자열·형식 불일치는 그대로 반환한다', () => {
        expect(roundToHalfHour('')).toBe('')
        expect(roundToHalfHour('abc')).toBe('abc')
        expect(roundToHalfHour('25:00')).toBe('25:00')
    })
})

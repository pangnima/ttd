import { describe, expect, it } from 'vitest'
import { MIN_RATING, MAX_RATING } from './constants'
import { getTier, getTierProgress, getTierDelta } from './tier'

describe('getTier - 계급 경계', () => {
    it('기본값 2.5는 골드 하한', () => {
        expect(getTier(2.5)).toBe('gold')
    })

    it('구간 경계값은 상위 계급에 포함된다 (min 포함)', () => {
        expect(getTier(1.0)).toBe('iron')
        expect(getTier(1.5)).toBe('bronze')
        expect(getTier(2.0)).toBe('silver')
        expect(getTier(2.5)).toBe('gold')
        expect(getTier(3.0)).toBe('platinum')
        expect(getTier(3.5)).toBe('diamond')
        expect(getTier(4.0)).toBe('master')
        expect(getTier(4.5)).toBe('challenger')
    })

    it('구간 직전 값은 하위 계급', () => {
        expect(getTier(2.499)).toBe('silver')
        expect(getTier(2.999)).toBe('gold')
        expect(getTier(4.499)).toBe('master')
    })

    it('상·하한 클램프', () => {
        expect(getTier(MIN_RATING)).toBe('iron')
        expect(getTier(MAX_RATING)).toBe('challenger')
        expect(getTier(7.0)).toBe('challenger')
    })
})

describe('getTierProgress - 포인트 환산', () => {
    it('구간 하한 = 0포인트', () => {
        expect(getTierProgress(2.5).points).toBe(0)
        expect(getTierProgress(2.5).tier).toBe('gold')
    })

    it('구간 중앙 ≈ 50포인트 (폭 0.5)', () => {
        expect(getTierProgress(2.75).points).toBe(50)
    })

    it('구간 상한 직전 = 99포인트 클램프', () => {
        expect(getTierProgress(2.99).points).toBe(98)
        expect(getTierProgress(2.999).points).toBe(99)
    })

    it('포인트는 0~99 범위', () => {
        const p = getTierProgress(1.0)
        expect(p.points).toBeGreaterThanOrEqual(0)
        expect(p.points).toBeLessThanOrEqual(99)
    })

    it('pointsToPromote = 100 - points', () => {
        const p = getTierProgress(2.75)
        expect(p.pointsToPromote).toBe(50)
    })

    it('챌린저는 종착 (pointsToPromote 0)', () => {
        const p = getTierProgress(5.0)
        expect(p.tier).toBe('challenger')
        expect(p.pointsToPromote).toBe(0)
    })
})

describe('getTierDelta - 경기 변동', () => {
    it('동일 계급 내 포인트 증가', () => {
        const d = getTierDelta(2.55, 2.60)
        expect(d.fromTier).toBe('gold')
        expect(d.toTier).toBe('gold')
        expect(d.pointDelta).toBe(10)
        expect(d.promoted).toBe(false)
        expect(d.demoted).toBe(false)
    })

    it('승급 (실버 → 골드)', () => {
        const d = getTierDelta(2.48, 2.52)
        expect(d.fromTier).toBe('silver')
        expect(d.toTier).toBe('gold')
        expect(d.promoted).toBe(true)
        expect(d.demoted).toBe(false)
    })

    it('강등 (골드 → 실버)', () => {
        const d = getTierDelta(2.52, 2.48)
        expect(d.fromTier).toBe('gold')
        expect(d.toTier).toBe('silver')
        expect(d.demoted).toBe(true)
        expect(d.promoted).toBe(false)
    })
})

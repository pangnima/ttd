import { describe, expect, it } from 'vitest'
import { effectiveNtrp } from './display'

describe('effectiveNtrp', () => {
    it('진화 NTRP(personalNtrp>0)가 있으면 우선', () => {
        expect(effectiveNtrp({ ntrp: 3.0, personalNtrp: 3.42 })).toBe(3.42)
    })
    it('personalNtrp 미보유(undefined)면 가입 시드 ntrp', () => {
        expect(effectiveNtrp({ ntrp: 3.0 })).toBe(3.0)
    })
    it('personalNtrp가 0 이하면 무시하고 시드 사용', () => {
        expect(effectiveNtrp({ ntrp: 2.5, personalNtrp: 0 })).toBe(2.5)
    })
    it('게스트(ntrp 0)도 시드 그대로 반환', () => {
        expect(effectiveNtrp({ ntrp: 0 })).toBe(0)
    })
})

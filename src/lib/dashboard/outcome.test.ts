import { describe, expect, it } from 'vitest'
import { formatGameSummary, formatRecord } from './outcome'

describe('formatRecord', () => {
    it('무가 없으면 승패만', () => {
        expect(formatRecord(3, 1)).toBe('3승 1패')
    })

    it('무가 있으면 뒤에 붙인다', () => {
        expect(formatRecord(3, 1, 1)).toBe('3승 1패 1무')
    })
})

describe('formatGameSummary', () => {
    it('게임 수 + 전적 — 카드가 몇 게임으로 집계되는지 말한다', () => {
        expect(formatGameSummary(3, 1, 2)).toBe('3게임 · 1승 2패')
    })

    it('무를 포함한 전적', () => {
        expect(formatGameSummary(3, 1, 1, 1)).toBe('3게임 · 1승 1패 1무')
    })

    it('전적이 0건(전부 미확정)이면 게임 수만 — 로테이션 헤더 폴백', () => {
        expect(formatGameSummary(2, 0, 0)).toBe('2게임')
        expect(formatGameSummary(2, 0, 0, 0)).toBe('2게임')
    })
})

import { describe, expect, it } from 'vitest'
import { todayIsoKst } from './split'

describe('todayIsoKst', () => {
    it('UTC 자정 직전은 한국 기준 다음 날', () => {
        expect(todayIsoKst(new Date('2026-09-04T23:30:00Z'))).toBe('2026-09-05')
        expect(todayIsoKst(new Date('2026-09-04T10:00:00Z'))).toBe('2026-09-04')
    })
})

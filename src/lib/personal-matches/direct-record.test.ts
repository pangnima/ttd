import { describe, it, expect } from 'vitest'
import { requiresRoom } from './direct-record'

describe('requiresRoom — 직접 기록의 경계', () => {
    it('비회원만 있으면 직접 기록할 수 있다 — 확인받을 상대가 없다', () => {
        expect(requiresRoom([{ }, { }])).toBe(false)
        expect(requiresRoom([])).toBe(false)
    })

    it('회원이 한 명이라도 끼면 매칭을 거쳐야 한다', () => {
        expect(requiresRoom([{ userId: 'u1' }])).toBe(true)
        expect(requiresRoom([{ }, { userId: 'u1' }, { }])).toBe(true)
    })

    it('빈 슬롯(모집 중)은 회원으로 치지 않는다', () => {
        expect(requiresRoom([{ userId: undefined }, { userId: '' }])).toBe(false)
    })
})

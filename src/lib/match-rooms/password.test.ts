import { describe, expect, it } from 'vitest'
import { validateRoomPassword } from './password'

describe('validateRoomPassword', () => {
    it('4~20자는 통과', () => {
        expect(validateRoomPassword('1234')).toBeNull()
        expect(validateRoomPassword('a'.repeat(20))).toBeNull()
    })

    it('3자 이하·21자 이상은 거부', () => {
        expect(validateRoomPassword('123')).toMatch(/4~20자/)
        expect(validateRoomPassword('a'.repeat(21))).toMatch(/4~20자/)
        expect(validateRoomPassword('')).toMatch(/4~20자/)
    })

    it('공백 포함은 거부', () => {
        expect(validateRoomPassword('ab cd')).toMatch(/공백/)
        expect(validateRoomPassword('abcd\t')).toMatch(/공백/)
    })
})

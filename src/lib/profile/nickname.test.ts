import { describe, it, expect } from 'vitest'
import { normalizeNickname, validateNickname, NICKNAME_MAX_LEN } from './nickname'

describe('normalizeNickname', () => {
    it.each([
        ['  백핸드장인  ', '백핸드장인'],
        ['홍  길동', '홍 길동'],
        ['홍\t길동', '홍 길동'],
        ['', ''],
    ])('%s → %s', (input, expected) => {
        expect(normalizeNickname(input)).toBe(expected)
    })

    it.each([[null], [undefined]])('빈 값은 빈 문자열 (%s)', (input) => {
        expect(normalizeNickname(input)).toBe('')
    })
})

describe('validateNickname', () => {
    it.each([['백핸드장인'], ['ab'], ['홍 길동'], ['가'.repeat(NICKNAME_MAX_LEN)]])(
        '%s 허용',
        (input) => {
            expect(validateNickname(input)).toBeNull()
        }
    )

    it.each([
        ['', '빈 값'],
        ['   ', '공백만'],
        ['가', '1자'],
        ['가'.repeat(NICKNAME_MAX_LEN + 1), '상한 초과'],
        ['백핸드장인', '제어문자'],
    ])('%s 거부 (%s)', (input) => {
        expect(validateNickname(input)).not.toBeNull()
    })

    it('앞뒤 공백을 뺀 길이로 판정한다', () => {
        expect(validateNickname(`  ${'가'.repeat(NICKNAME_MAX_LEN)}  `)).toBeNull()
    })
})

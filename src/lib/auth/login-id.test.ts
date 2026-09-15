import { describe, it, expect } from 'vitest'
import { LOGIN_ID_MAX_LEN, LOGIN_ID_PATTERN, normalizeLoginId, validateLoginId } from './login-id'
import { looksLikeEmail } from './email'

describe('normalizeLoginId', () => {
    it.each([
        ['  Tennis_01 ', 'tennis_01'],
        ['ABCD', 'abcd'],
        ['', ''],
    ])('%s → %s', (input, expected) => {
        expect(normalizeLoginId(input)).toBe(expected)
    })

    it.each([[null], [undefined]])('빈 값은 빈 문자열 (%s)', (input) => {
        expect(normalizeLoginId(input)).toBe('')
    })
})

describe('validateLoginId', () => {
    it.each([['abcd'], ['tennis_01'], ['1234'], ['a'.repeat(LOGIN_ID_MAX_LEN)]])('%s 허용', (input) => {
        expect(validateLoginId(input)).toBeNull()
    })

    it.each([
        ['', '빈 값'],
        ['abc', '3자'],
        ['a'.repeat(LOGIN_ID_MAX_LEN + 1), '21자'],
        ['ABCD', '대문자(정규화 전)'],
        ['한글아이디', '한글'],
        ['ab cd', '공백'],
        ['ab-cd', '하이픈'],
        ['ab.cd', '점'],
        ['ab@cd', '@'],
    ])('%s 거절 (%s)', (input) => {
        expect(validateLoginId(input)).not.toBeNull()
    })

    it('정규식은 DB CHECK와 같다', () => {
        expect(LOGIN_ID_PATTERN.source).toBe('^[a-z0-9_]{4,20}$')
    })
})

describe('로그인 칸의 분기 — 아이디와 이메일이 겹치지 않는다', () => {
    it('유효한 아이디는 이메일처럼 보이지 않는다', () => {
        for (const id of ['abcd', 'tennis_01', 'a1_b2']) {
            expect(validateLoginId(id)).toBeNull()
            expect(looksLikeEmail(id)).toBe(false)
        }
    })

    it('이메일은 아이디 규칙을 통과하지 못한다', () => {
        expect(looksLikeEmail('user@example.com')).toBe(true)
        expect(validateLoginId('user@example.com')).not.toBeNull()
    })
})

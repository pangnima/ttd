import { describe, it, expect } from 'vitest'
import {
    PASSWORD_MIN_LEN,
    PASSWORD_POLICY_MESSAGE,
    PASSWORD_RULES,
    PASSWORD_SYMBOLS,
    unmetPasswordRules,
    validatePassword,
} from './password-policy'

describe('unmetPasswordRules', () => {
    it('네 규칙을 다 지키면 빈 배열', () => {
        expect(unmetPasswordRules('tennis1!')).toEqual([])
    })

    it.each([
        ['ab1!', ['length']],
        ['12345678!', ['letter']],
        ['abcdefg!', ['digit']],
        ['abcdefg1', ['symbol']],
        ['', ['length', 'letter', 'digit', 'symbol']],
    ])('%s → %j', (input, expected) => {
        expect(unmetPasswordRules(input)).toEqual(expected)
    })

    it('Supabase 허용 특수문자는 전부 특수문자로 센다', () => {
        for (const ch of PASSWORD_SYMBOLS) {
            expect(unmetPasswordRules(`abcdefg1${ch}`)).toEqual([])
        }
    })

    it('한글·공백은 어느 규칙도 채우지 않는다', () => {
        expect(unmetPasswordRules('테니스클럽 플랫폼')).toEqual(['letter', 'digit', 'symbol'])
    })

    it('영문은 대소문자를 가리지 않는다', () => {
        expect(unmetPasswordRules('ABCDEFG1!')).toEqual([])
    })
})

describe('validatePassword', () => {
    it('통과하면 null', () => {
        expect(validatePassword('Tennis2026!')).toBeNull()
    })

    it.each([[null], [undefined], [''], ['123123'], ['password']])('%s 는 정책 문구', (input) => {
        expect(validatePassword(input)).toBe(PASSWORD_POLICY_MESSAGE)
    })
})

describe('상수 정합', () => {
    it('최소 길이 8, 규칙 4개', () => {
        expect(PASSWORD_MIN_LEN).toBe(8)
        expect(PASSWORD_RULES.map((r) => r.key)).toEqual(['length', 'letter', 'digit', 'symbol'])
    })

    it('정책 문구가 최소 길이를 말한다', () => {
        expect(PASSWORD_POLICY_MESSAGE).toContain(`${PASSWORD_MIN_LEN}자`)
    })
})

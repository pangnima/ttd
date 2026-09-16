import { describe, it, expect } from 'vitest'
import { INVALID_CREDENTIALS_MESSAGE, mapAuthError } from './auth-error-messages'

// 키는 Supabase가 실제로 돌려주는 문장에서 잘라 낸다 — F-16은 키가 실제 문장과 달라 폴백으로 떨어진 결함이었다.
describe('mapAuthError', () => {
    it.each([
        ['Invalid login credentials', INVALID_CREDENTIALS_MESSAGE],
        ['New password should be different from the old password.', '기존 비밀번호와 다른 비밀번호를 입력해 주세요.'],
        ['User already registered', '이미 가입된 이메일입니다.'],
        ['Database error saving new user', '가입 정보가 방금 다른 회원과 겹쳤습니다. 아이디·닉네임을 확인하고 다시 시도해 주세요.'],
    ])('%s → %s', (input, expected) => {
        expect(mapAuthError(input)).toBe(expected)
    })

    it('모르는 문장과 빈 값은 폴백', () => {
        expect(mapAuthError('Something odd')).toBe('오류가 발생했습니다. 잠시 후 다시 시도해 주세요.')
        expect(mapAuthError(null)).toBe('오류가 발생했습니다. 잠시 후 다시 시도해 주세요.')
    })
})

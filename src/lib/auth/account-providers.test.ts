import { describe, expect, it } from 'vitest'
import {
    authProviders, hasPasswordIdentity, isSocialOnlyAccount, socialProviderLabel,
} from './account-providers'

describe('hasPasswordIdentity — 비밀번호 변경 폼을 내보일지 가르는 술어', () => {
    it('구글 전용 계정은 비밀번호가 없다 (app_metadata 실측 모양)', () => {
        expect(hasPasswordIdentity({ providers: ['google'] })).toBe(false)
        expect(isSocialOnlyAccount({ providers: ['google'] })).toBe(true)
    })

    it('identities 쪽만 와도 같은 판정이다 — 두 신호 중 하나에만 걸지 않는다', () => {
        expect(hasPasswordIdentity({ identities: [{ provider: 'google' }] })).toBe(false)
    })

    it('이메일 가입 회원은 폼을 그대로 본다', () => {
        expect(hasPasswordIdentity({ providers: ['email'] })).toBe(true)
    })

    it('구글을 연결한 이메일 회원도 비밀번호가 있다 — 합집합으로 읽는다', () => {
        expect(hasPasswordIdentity({ providers: ['email', 'google'] })).toBe(true)
    })

    it('두 신호가 어긋나도 합집합이라 비밀번호를 놓치지 않는다', () => {
        const signals = { identities: [{ provider: 'email' }], providers: ['google'] }
        expect(hasPasswordIdentity(signals)).toBe(true)
        expect(authProviders(signals).sort()).toEqual(['email', 'google'])
    })

    it('⚠ 신호가 없으면 true다 — 모른다고 기존 회원의 비밀번호 변경을 빼앗지 않는다', () => {
        expect(hasPasswordIdentity({})).toBe(true)
        expect(hasPasswordIdentity({ identities: null, providers: undefined })).toBe(true)
        expect(hasPasswordIdentity({ providers: [] })).toBe(true)
    })

    it('모르는 provider만 있으면 비밀번호는 없다고 본다', () => {
        expect(hasPasswordIdentity({ providers: ['apple'] })).toBe(false)
    })
})

describe('socialProviderLabel — 문장에 넣을 이름', () => {
    it('구글·카카오는 한글 이름을 돌려준다', () => {
        expect(socialProviderLabel({ providers: ['google'] })).toBe('구글')
        expect(socialProviderLabel({ providers: ['kakao'] })).toBe('카카오')
    })

    it('모르는 provider나 신호 없음이면 null — 호출부가 폴백을 고른다', () => {
        expect(socialProviderLabel({ providers: ['apple'] })).toBeNull()
        expect(socialProviderLabel({})).toBeNull()
    })

    it('email은 소셜 이름이 아니다', () => {
        expect(socialProviderLabel({ providers: ['email'] })).toBeNull()
    })
})

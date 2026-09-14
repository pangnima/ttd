import { describe, expect, it } from 'vitest'
import { needsProfileOnboarding, PROFILE_ONBOARDING_PATH } from './onboarding-gate'

describe('needsProfileOnboarding — ntrp is null이 "테니스 정보 미입력"의 권위 술어(0084)', () => {
    it('ntrp가 없으면 완성 화면으로 보낸다 — 소셜 가입자', () => {
        expect(needsProfileOnboarding({ ntrp: null })).toBe(true)
    })

    it('ntrp가 있으면 보내지 않는다 — 이메일 가입은 폼이 NTRP를 필수로 받는다', () => {
        expect(needsProfileOnboarding({ ntrp: 3.5 })).toBe(false)
    })

    it('1.0도 값이다 — falsy로 판정하면 최하위 NTRP 회원이 영영 갇힌다', () => {
        expect(needsProfileOnboarding({ ntrp: 1.0 })).toBe(false)
    })

    it('프로필 행 자체가 없으면 보내지 않는다 — 트리거 실패 같은 예외 상태를 이 화면이 떠안지 않는다', () => {
        expect(needsProfileOnboarding(null)).toBe(false)
    })
})

describe('완성 화면 경로', () => {
    it('(main) 밖이다 — 게이트가 그 레이아웃에 있어 안에 두면 스스로를 리다이렉트한다', () => {
        expect(PROFILE_ONBOARDING_PATH.startsWith('/onboarding')).toBe(true)
    })

    it('/signup 아래가 아니다 — 미들웨어의 isAuthRoute가 로그인 상태를 튕겨낸다', () => {
        expect(PROFILE_ONBOARDING_PATH.startsWith('/signup')).toBe(false)
        expect(PROFILE_ONBOARDING_PATH).not.toBe('/login')
    })
})

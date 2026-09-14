import { describe, expect, it } from 'vitest'
import { buildOnboardingSteps, countCompletedSteps, isOnboardingComplete } from './onboarding'

const input = { userId: 'u1', hasPersonalMatch: false, hasProfileImage: false }

describe('buildOnboardingSteps', () => {
    it('두 단계다 — 클럽 둘러보기는 Week 54에 내렸다', () => {
        expect(buildOnboardingSteps(input).map((s) => s.key)).toEqual(['personal-match', 'profile'])
    })

    it('첫 단계는 개인 경기 기록 — 클럽 없이도 혼자 끝낼 수 있는 일부터', () => {
        const [first] = buildOnboardingSteps(input)
        expect(first.title).toBe('첫 경기 기록하기')
        expect(first.href).toBe('/me/personal-matches/new')
    })

    it('남은 단계가 /clubs로 보내지 않는다 — 클럽은 동결 상태다', () => {
        expect(buildOnboardingSteps(input).map((s) => s.href)).not.toContain('/clubs')
    })
})

describe('완료 판정', () => {
    it('둘 다 하면 끝난다 — 셋째 단계가 없어 영영 미완료로 남지 않는다', () => {
        const steps = buildOnboardingSteps({ ...input, hasPersonalMatch: true, hasProfileImage: true })
        expect(isOnboardingComplete(steps)).toBe(true)
        expect(countCompletedSteps(steps)).toBe(2)
    })

    it('하나만 하면 아직 미완료', () => {
        const steps = buildOnboardingSteps({ ...input, hasPersonalMatch: true })
        expect(isOnboardingComplete(steps)).toBe(false)
        expect(countCompletedSteps(steps)).toBe(1)
    })

    it('아무것도 안 했으면 0단계', () => {
        expect(countCompletedSteps(buildOnboardingSteps(input))).toBe(0)
    })
})

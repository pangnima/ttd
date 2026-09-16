import { describe, expect, it } from 'vitest'
import { buildOnboardingSteps, countCompletedSteps, isOnboardingComplete } from './onboarding'

const input = { userId: 'u1', hasJoinedRoom: false, hasPersonalMatch: false, hasProfileImage: false }

describe('buildOnboardingSteps', () => {
    it('두 단계다 — 클럽 둘러보기는 Week 54에 내렸다', () => {
        expect(buildOnboardingSteps(input).map((s) => s.key)).toEqual(['join-match', 'profile'])
    })

    it('첫 단계는 매칭 참여 — 회원이 끼는 경기는 전부 매칭을 거친다(Week 39)', () => {
        const [first] = buildOnboardingSteps(input)
        expect(first.title).toBe('첫 매칭 참여하기')
        expect(first.href).toBe('/match-rooms')
    })

    it('동결·철거 경로로 보내지 않는다 — 클럽은 동결, 직접 기록은 비회원 전용이다', () => {
        const hrefs = buildOnboardingSteps(input).map((s) => s.href)
        expect(hrefs).not.toContain('/clubs')
        expect(hrefs).not.toContain('/me/personal-matches/new')
    })
})

describe('매칭 참여 단계의 done', () => {
    it('참가 중인 매칭이 있으면 끝', () => {
        expect(buildOnboardingSteps({ ...input, hasJoinedRoom: true })[0].done).toBe(true)
    })

    it('확정 전적만 있어도 끝 — 비회원과만 치는 사람의 탈출구', () => {
        expect(buildOnboardingSteps({ ...input, hasPersonalMatch: true })[0].done).toBe(true)
    })

    it('둘 다 없으면 미완료', () => {
        expect(buildOnboardingSteps(input)[0].done).toBe(false)
    })
})

describe('프로필 단계 — 기본 아바타는 완성이 아니다(U-pre-1)', () => {
    it('사진이 기본 아바타뿐이면 미완료, 휴대폰·라켓 중 하나라도 적으면 완료', () => {
        const profile = (i: Partial<typeof input> & { hasContactOrRacket?: boolean }) =>
            buildOnboardingSteps({ ...input, ...i }).find((s) => s.key === 'profile')!.done
        expect(profile({ hasProfileImage: false })).toBe(false)
        expect(profile({ hasProfileImage: true })).toBe(true)
        expect(profile({ hasProfileImage: false, hasContactOrRacket: true })).toBe(true)
    })
})

describe('완료 판정', () => {
    it('둘 다 하면 끝난다 — 셋째 단계가 없어 영영 미완료로 남지 않는다', () => {
        const steps = buildOnboardingSteps({ ...input, hasJoinedRoom: true, hasProfileImage: true })
        expect(isOnboardingComplete(steps)).toBe(true)
        expect(countCompletedSteps(steps)).toBe(2)
    })

    it('하나만 하면 아직 미완료', () => {
        const steps = buildOnboardingSteps({ ...input, hasJoinedRoom: true })
        expect(isOnboardingComplete(steps)).toBe(false)
        expect(countCompletedSteps(steps)).toBe(1)
    })

    it('아무것도 안 했으면 0단계', () => {
        expect(countCompletedSteps(buildOnboardingSteps(input))).toBe(0)
    })
})

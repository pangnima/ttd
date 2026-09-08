import { describe, expect, it } from 'vitest'
import { HUB_TABS, hubTabHref, resolveHubTab } from './tabs'

describe('resolveHubTab', () => {
    it('세 탭 키는 그대로 통과한다', () => {
        expect(resolveHubTab('mine')).toBe('mine')
        expect(resolveHubTab('waiting')).toBe('waiting')
        expect(resolveHubTab('disputed')).toBe('disputed')
    })

    it('미지의 값·미지정은 기본 탭으로 떨어진다', () => {
        expect(resolveHubTab('garbage')).toBe('mine')
        expect(resolveHubTab(undefined)).toBe('mine')
        expect(resolveHubTab('')).toBe('mine')
    })
})

describe('HUB_TABS / hubTabHref', () => {
    it('기본 탭은 파라미터 없는 경로 — 첫 진입 URL이 지저분해지지 않게', () => {
        expect(HUB_TABS[0].key).toBe('mine')
        expect(HUB_TABS[0].href).toBe('/me/match-requests')
    })

    it('나머지 탭은 ?tab= 으로 — 저장 후 리다이렉트(use-personal-match-submit)와 같은 값', () => {
        expect(hubTabHref('waiting')).toBe('/me/match-requests?tab=waiting')
        expect(hubTabHref('disputed')).toBe('/me/match-requests?tab=disputed')
    })
})

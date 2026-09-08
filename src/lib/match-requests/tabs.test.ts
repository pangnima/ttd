import { describe, expect, it } from 'vitest'
import { HUB_SUB_TABS, HUB_TOP_TABS, hubTabHref, hubTopOf, resolveHubTab } from './tabs'

describe('resolveHubTab', () => {
    it('네 자리 키는 그대로 통과한다', () => {
        expect(resolveHubTab('invite')).toBe('invite')
        expect(resolveHubTab('result')).toBe('result')
        expect(resolveHubTab('dispute')).toBe('dispute')
        expect(resolveHubTab('waiting')).toBe('waiting')
    })

    it('0064까지의 키는 새 자리로 떨어진다 — 기존 링크·북마크·저장 후 리다이렉트가 산다', () => {
        expect(resolveHubTab('mine')).toBe('invite')      // 종전 「승인 요청」 = 참여 확인 + 결과 확인
        expect(resolveHubTab('settle')).toBe('result')    // 종전 「경기 확정 대기」 = 결과 입력 + 참가자 채우기
        expect(resolveHubTab('disputed')).toBe('dispute') // 종전 「이의 처리」 — 이제 내 차례만 담는다
    })

    it('미지의 값·미지정은 기본 탭(초대)으로 떨어진다', () => {
        expect(resolveHubTab('garbage')).toBe('invite')
        expect(resolveHubTab(undefined)).toBe('invite')
        expect(resolveHubTab('')).toBe('invite')
    })
})

describe('hubTabHref', () => {
    it('기본 탭은 파라미터 없는 경로 — 첫 진입 URL이 지저분해지지 않게', () => {
        expect(hubTabHref('invite')).toBe('/me/match-requests')
    })

    it('나머지는 ?tab= 으로 — 저장 후 리다이렉트(use-personal-match-submit)와 같은 값', () => {
        expect(hubTabHref('result')).toBe('/me/match-requests?tab=result')
        expect(hubTabHref('dispute')).toBe('/me/match-requests?tab=dispute')
        expect(hubTabHref('waiting')).toBe('/me/match-requests?tab=waiting')
    })
})

describe('2단 탭 메타', () => {
    it('최상위는 차례 축 둘 — 승인 요청 / 상대 승인 대기', () => {
        expect(HUB_TOP_TABS.map((t) => t.key)).toEqual(['mine', 'waiting'])
        expect(HUB_TOP_TABS.map((t) => t.label)).toEqual(['승인 요청', '상대 승인 대기'])
    })

    it('승인 요청의 href는 첫 하위 탭으로 고정 — 스마트 착지는 URL을 불안정하게 만든다', () => {
        expect(HUB_TOP_TABS[0].href).toBe(hubTabHref('invite'))
        expect(HUB_TOP_TABS[1].href).toBe(hubTabHref('waiting'))
    })

    it('하위 탭은 생애 순서 — 초대 → 경기 결과 확정 → 이의 신청', () => {
        expect(HUB_SUB_TABS.map((t) => t.key)).toEqual(['invite', 'result', 'dispute'])
        expect(HUB_SUB_TABS.map((t) => t.label)).toEqual(['초대', '경기 결과 확정', '이의 신청'])
    })

    it('hubTopOf — waiting만 상대 승인 대기이고 나머지는 전부 승인 요청 아래다', () => {
        expect(hubTopOf('invite')).toBe('mine')
        expect(hubTopOf('result')).toBe('mine')
        expect(hubTopOf('dispute')).toBe('mine')
        expect(hubTopOf('waiting')).toBe('waiting')
    })
})

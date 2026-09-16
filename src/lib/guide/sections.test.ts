import { describe, expect, it } from 'vitest'
import { GUIDE_FLOW_STEPS, GUIDE_SCREEN_SECTIONS, GUIDE_SECTIONS, guideAnchorHref, type GuideScreenId } from './sections'
import { myMatchNavItems } from '@/lib/nav-items'
import { stripEmphasis } from './emphasis'
import { ROOM_STAGE_LABEL } from '@/lib/match-rooms/room-stage'

/** 동결·철거된 경로 — 가이드가 여기로 보내면 「눌러도 갈 곳이 없는 링크」가 된다 */
const RETIRED_PATHS = ['/clubs', '/me/match-requests', '/me/analytics', '/me/personal-matches/new']

/** 폐기된 노출 어휘(Week 54·67) — 코드 식별자에는 남아 있어 grep으로는 못 잡는다. '개인 경기 결과'는 옛 메뉴명(→ 내 경기 결과) */
const RETIRED_WORDS = ['방장', '클럽', '강퇴', '초대됨', '개인 경기 결과']

const allText = (s: (typeof GUIDE_SECTIONS)[number]) => [s.title, s.summary, ...s.steps].join('\n')

describe('GUIDE_SECTIONS', () => {
    it('id가 유일하다 — 앵커(#id)가 겹치면 링크가 엉뚱한 곳에 선다', () => {
        const ids = GUIDE_SECTIONS.map((s) => s.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it('화면 섹션 href가 사이드바 메뉴 href와 1:1로 같다 — 가이드가 말하는 화면이 곧 메뉴의 화면이다', () => {
        const order: GuideScreenId[] = ['match-rooms', 'my-match-rooms', 'personal-matches']
        expect(order.map((id) => GUIDE_SCREEN_SECTIONS[id].href)).toEqual(myMatchNavItems.map((n) => n.href))
    })

    it('동결·철거 경로로 링크하거나 언급하지 않는다', () => {
        for (const s of GUIDE_SECTIONS) {
            for (const p of RETIRED_PATHS) {
                expect(s.href ?? '').not.toBe(p)
                expect(allText(s)).not.toContain(p)
            }
        }
    })

    it('노출 문구에 폐기 어휘가 없다 — 호스트·매칭·내보내기·초대 대기가 정본이다', () => {
        for (const s of GUIDE_SECTIONS) {
            for (const w of RETIRED_WORDS) expect(allText(s)).not.toContain(w)
        }
    })

    it('괄호 표기(「」·[ ])를 쓰지 않는다 — 강조는 **…** 하나로, 그리는 쪽이 굵기·색으로 드러낸다', () => {
        for (const s of GUIDE_SECTIONS) {
            expect(allText(s)).not.toMatch(/[「」\[\]]/)
        }
    })

    it('단계 섹션이 룸 배너의 다섯 단계를 전부 말한다', () => {
        const stages = GUIDE_SECTIONS.find((s) => s.id === 'stages')!
        for (const label of Object.values(ROOM_STAGE_LABEL)) {
            expect(stages.steps.map(stripEmphasis).some((step) => step.startsWith(`${label} — `))).toBe(true)
        }
    })

    it('모든 섹션이 한 줄 요약과 3~6개의 단계를 가진다', () => {
        for (const s of GUIDE_SECTIONS) {
            expect(s.summary).not.toContain('\n')
            expect(s.steps.length).toBeGreaterThanOrEqual(3)
            expect(s.steps.length).toBeLessThanOrEqual(6)
        }
    })

    it('앵커 href는 /guide#<id>', () => {
        expect(guideAnchorHref('my-match-rooms')).toBe('/guide#my-match-rooms')
    })
})

describe('GUIDE_FLOW_STEPS', () => {
    it('흐름 문구의 단계 수와 같다 — 스테퍼 칸과 글이 하나씩 짝이다', () => {
        const flow = GUIDE_SECTIONS.find((s) => s.id === 'flow')!
        expect(GUIDE_FLOW_STEPS).toHaveLength(flow.steps.length)
    })

    it('앵커가 실제 섹션 id다', () => {
        const ids = new Set(GUIDE_SECTIONS.map((s) => s.id))
        for (const step of GUIDE_FLOW_STEPS) expect(ids.has(step.anchor)).toBe(true)
    })

    it('라벨·화면 이름에 괄호 표기가 없다', () => {
        for (const step of GUIDE_FLOW_STEPS) expect(`${step.label}${step.screen}`).not.toMatch(/[「」\[\]]/)
    })
})

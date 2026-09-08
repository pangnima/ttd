import { describe, expect, it } from 'vitest'
import type { PersonalMatchSetScore } from '@/types'
import { invertSetScores, swapPartnerPerspective } from './perspective'

describe('invertSetScores (복식 애드 교차 반전)', () => {
    it('me/opp 스왑 + myAd↔oppAd 교차 매핑', () => {
        const out = invertSetScores([{ me: 6, opp: 4, myAd: 'partner', oppAd: 'opponent' }])
        expect(out).toEqual([{ me: 4, opp: 6, myAd: 'me', oppAd: 'opponent2' }])
    })

    it('애드 키가 없으면 추가하지 않고, 한쪽만 있으면 그쪽만 교차', () => {
        expect(invertSetScores([{ me: 6, opp: 4 }])).toEqual([{ me: 4, opp: 6 }])
        expect(invertSetScores([{ me: 6, opp: 4, myAd: 'me' }])).toEqual([{ me: 4, opp: 6, oppAd: 'opponent' }])
        expect(invertSetScores([{ me: 6, opp: 4, oppAd: 'opponent2' }])).toEqual([{ me: 4, opp: 6, myAd: 'partner' }])
    })

    it('두 번 반전하면 원본으로 돌아온다 (애드 포함)', () => {
        const sets = [
            { me: 6, opp: 4, myAd: 'me' as const, oppAd: 'opponent2' as const },
            { me: 3, opp: 6, myAd: 'partner' as const, oppAd: 'opponent' as const },
        ]
        expect(invertSetScores(invertSetScores(sets))).toEqual(sets)
    })
})

describe('swapPartnerPerspective — 팀 안쪽 관점 (0059)', () => {
    it('스코어는 그대로 두고 내 애드만 뒤집는다', () => {
        expect(swapPartnerPerspective([{ me: 6, opp: 4, myAd: 'me' }]))
            .toEqual([{ me: 6, opp: 4, myAd: 'partner' }])
        expect(swapPartnerPerspective([{ me: 6, opp: 4, oppAd: 'opponent' }]))
            .toEqual([{ me: 6, opp: 4, oppAd: 'opponent' }])
    })

    it('대합이다 — 두 번 적용하면 원본', () => {
        const x: PersonalMatchSetScore[] = [{ me: 7, opp: 5, myAd: 'partner', oppAd: 'opponent2' }]
        expect(swapPartnerPerspective(swapPartnerPerspective(x))).toEqual(x)
    })
})

describe('좌석별 표시 변환 — DB 0059 매트릭스의 거울', () => {
    // 애드 조합을 전부 넣는다. 스코어만 보면 합성 순서 오류가 드러나지 않는다.
    const base: PersonalMatchSetScore[] = [
        { me: 6, opp: 4 },
        { me: 6, opp: 4, myAd: 'me' },
        { me: 7, opp: 5, myAd: 'partner' },
        { me: 3, opp: 6, oppAd: 'opponent' },
        { me: 2, opp: 6, oppAd: 'opponent2' },
        { me: 6, opp: 3, myAd: 'me', oppAd: 'opponent2' },
    ]

    it('상대2 표시는 P∘I — 순서를 뒤집으면 애드가 어긋난다', () => {
        const shown = swapPartnerPerspective(invertSetScores([{ me: 6, opp: 4, myAd: 'me' }]))
        expect(shown).toEqual([{ me: 4, opp: 6, oppAd: 'opponent' }])
        // 순서를 뒤집은 식은 다른 값을 낸다 — 이 차이가 판별식이다
        const wrong = invertSetScores(swapPartnerPerspective([{ me: 6, opp: 4, myAd: 'me' }]))
        expect(wrong).not.toEqual(shown)
    })

    it('네 좌석 모두 왕복하면 항등이다', () => {
        expect(base).toEqual(base)
        expect(swapPartnerPerspective(swapPartnerPerspective(base))).toEqual(base)
        expect(invertSetScores(invertSetScores(base))).toEqual(base)
        const toOpp2 = swapPartnerPerspective(invertSetScores(base))
        expect(invertSetScores(swapPartnerPerspective(toOpp2))).toEqual(base)
    })
})

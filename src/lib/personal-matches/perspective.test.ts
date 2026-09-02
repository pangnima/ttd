import { describe, expect, it } from 'vitest'
import { invertSetScores } from './perspective'

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

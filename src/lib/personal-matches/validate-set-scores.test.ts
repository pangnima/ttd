import { describe, expect, it } from 'vitest'
import { validateSetScores } from './validate-input'

describe('validateSetScores', () => {
    it('정상 세트(1~5개, 0~99 정수)는 통과', () => {
        expect(validateSetScores([{ me: 6, opp: 4 }])).toBeNull()
        expect(validateSetScores([{ me: 6, opp: 4 }, { me: 3, opp: 6 }, { me: 7, opp: 5 }])).toBeNull()
        expect(validateSetScores(Array.from({ length: 5 }, () => ({ me: 6, opp: 0 })))).toBeNull()
    })

    it('빈 배열은 기본(min 1)에서 거부, min 0이면 허용', () => {
        expect(validateSetScores([])).toBe('세트를 1개 이상 입력해주세요.')
        expect(validateSetScores([], { min: 0 })).toBeNull()
    })

    it('세트 개수 상한(기본 5) 초과 거부', () => {
        const six = Array.from({ length: 6 }, () => ({ me: 6, opp: 4 }))
        expect(validateSetScores(six)).toBe('세트는 최대 5개까지 등록할 수 있습니다.')
        expect(validateSetScores(six, { max: 6 })).toBeNull()
    })

    it('0-0 세트·범위 밖·정수 아님·NaN은 거부', () => {
        expect(validateSetScores([{ me: 0, opp: 0 }])).toBe('0-0 세트는 저장할 수 없습니다.')
        expect(validateSetScores([{ me: 100, opp: 4 }])).toBe('세트 스코어를 올바르게 입력해주세요.')
        expect(validateSetScores([{ me: -1, opp: 4 }])).toBe('세트 스코어를 올바르게 입력해주세요.')
        expect(validateSetScores([{ me: 6.5, opp: 4 }])).toBe('세트 스코어를 올바르게 입력해주세요.')
        expect(validateSetScores([{ me: NaN, opp: 4 }])).toBe('세트 스코어를 올바르게 입력해주세요.')
    })

    it('복식 애드/듀스 enum 검증 유지', () => {
        expect(validateSetScores([{ me: 6, opp: 4, myAd: 'me', oppAd: 'opponent2' }])).toBeNull()
        expect(validateSetScores([{ me: 6, opp: 4, myAd: 'x' as 'me' }])).toBe('세트 애드 코트 값이 올바르지 않습니다.')
    })
})

import { describe, expect, it } from 'vitest'
import { splitEmphasis, stripEmphasis } from './emphasis'

describe('splitEmphasis', () => {
    it('강조가 없으면 조각 하나', () => {
        expect(splitEmphasis('그냥 문장')).toEqual([{ text: '그냥 문장', strong: false }])
    })

    it('**…**를 강조 조각으로 가른다 — 앞뒤 평문은 그대로', () => {
        expect(splitEmphasis('카드의 **결과 입력** 표시가 내 차례입니다')).toEqual([
            { text: '카드의 ', strong: false },
            { text: '결과 입력', strong: true },
            { text: ' 표시가 내 차례입니다', strong: false },
        ])
    })

    it('연속·문두·문미 강조도 빈 조각 없이 가른다', () => {
        expect(splitEmphasis('**A**·**B**')).toEqual([
            { text: 'A', strong: true },
            { text: '·', strong: false },
            { text: 'B', strong: true },
        ])
    })

    it('짝이 안 맞는 별표는 평문으로 둔다', () => {
        expect(splitEmphasis('a ** b')).toEqual([{ text: 'a ** b', strong: false }])
    })
})

describe('stripEmphasis', () => {
    it('마크업만 벗긴다', () => {
        expect(stripEmphasis('**진행 중** 탭')).toBe('진행 중 탭')
    })
})

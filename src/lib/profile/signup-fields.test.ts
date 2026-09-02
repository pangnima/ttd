import { describe, it, expect } from 'vitest'
import {
    resolveRacketBrand,
    splitRacketBrand,
    normalizeRacketModel,
    formatRacket,
    RACKET_MODEL_MAX_LEN,
    isSignupNtrp,
    isGenderValue,
    isHandValue,
    RACKET_BRAND_MAX_LEN,
    SIGNUP_NTRP_OPTIONS,
} from './signup-fields'

describe('resolveRacketBrand', () => {
    it('프리셋 선택은 한글 라벨을 저장한다', () => {
        expect(resolveRacketBrand('wilson', null)).toBe('윌슨')
        expect(resolveRacketBrand('head', '')).toBe('헤드')
        expect(resolveRacketBrand('yonex', '무시됨')).toBe('요넥스')
        expect(resolveRacketBrand('babolat', undefined)).toBe('바볼랏')
    })

    it('기타는 입력 텍스트를 trim해 저장한다', () => {
        expect(resolveRacketBrand('other', '  프린스 ')).toBe('프린스')
    })

    it('기타 + 빈 텍스트는 null', () => {
        expect(resolveRacketBrand('other', '')).toBeNull()
        expect(resolveRacketBrand('other', '   ')).toBeNull()
        expect(resolveRacketBrand('other', null)).toBeNull()
    })

    it('기타 텍스트는 최대 길이로 잘린다', () => {
        const long = 'a'.repeat(RACKET_BRAND_MAX_LEN + 10)
        expect(resolveRacketBrand('other', long)).toHaveLength(RACKET_BRAND_MAX_LEN)
    })

    it('미선택·알 수 없는 값은 null', () => {
        expect(resolveRacketBrand(null, '텍스트')).toBeNull()
        expect(resolveRacketBrand('', '텍스트')).toBeNull()
        expect(resolveRacketBrand('prince', '텍스트')).toBeNull()
    })
})

describe('isSignupNtrp', () => {
    it('1.0~4.0 0.5 단위 7개', () => {
        expect(SIGNUP_NTRP_OPTIONS).toHaveLength(7)
        for (const v of SIGNUP_NTRP_OPTIONS) expect(isSignupNtrp(v)).toBe(true)
    })

    it('범위 밖·형식 불일치 거부', () => {
        expect(isSignupNtrp('4.5')).toBe(false)
        expect(isSignupNtrp('7.0')).toBe(false)
        expect(isSignupNtrp('3')).toBe(false)
        expect(isSignupNtrp('')).toBe(false)
        expect(isSignupNtrp(null)).toBe(false)
    })
})

describe('gender / hand 가드', () => {
    it('허용값만 통과', () => {
        expect(isGenderValue('male')).toBe(true)
        expect(isGenderValue('other')).toBe(false)
        expect(isHandValue('left')).toBe(true)
        expect(isHandValue('both')).toBe(false)
    })
})

describe('splitRacketBrand / normalizeRacketModel / formatRacket', () => {
    it('저장값 → 편집 초기값 역매핑 (프리셋 라벨·기타·null)', () => {
        expect(splitRacketBrand('요넥스')).toEqual({ choice: 'yonex', otherText: '' })
        expect(splitRacketBrand('프린스')).toEqual({ choice: 'other', otherText: '프린스' })
        expect(splitRacketBrand(null)).toEqual({ choice: undefined, otherText: '' })
    })

    it('resolve → split 왕복', () => {
        for (const choice of ['wilson', 'head', 'yonex', 'babolat'] as const) {
            expect(splitRacketBrand(resolveRacketBrand(choice, null)).choice).toBe(choice)
        }
        expect(splitRacketBrand(resolveRacketBrand('other', ' 던롭 '))).toEqual({ choice: 'other', otherText: '던롭' })
    })

    it('라켓명은 trim·길이 제한, 빈 값 null', () => {
        expect(normalizeRacketModel('  프로스태프 97 ')).toBe('프로스태프 97')
        expect(normalizeRacketModel('   ')).toBeNull()
        expect(normalizeRacketModel(undefined)).toBeNull()
        expect(normalizeRacketModel('x'.repeat(RACKET_MODEL_MAX_LEN + 5))).toHaveLength(RACKET_MODEL_MAX_LEN)
    })

    it('표시 문자열', () => {
        expect(formatRacket('윌슨', '프로스태프 97')).toBe('윌슨 · 프로스태프 97')
        expect(formatRacket('윌슨', null)).toBe('윌슨')
        expect(formatRacket(null, '퓨어 에어로')).toBe('퓨어 에어로')
        expect(formatRacket(null, null)).toBe('미입력')
    })
})

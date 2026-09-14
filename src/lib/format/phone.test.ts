import { describe, it, expect } from 'vitest'
import { formatPhoneNumber, normalizePhone, isValidMobilePhone, isBlankPhone, PHONE_PREFIX } from './phone'

describe('formatPhoneNumber', () => {
    it.each([
        ['010', '010'],
        ['0101234', '010-1234'],
        ['01012345', '010-1234-5'],
        ['01012345678', '010-1234-5678'],
        ['010-1234-5678', '010-1234-5678'],
        ['010 1234 5678', '010-1234-5678'],
    ])('010은 3-4-4로 채운다: %s → %s', (input, expected) => {
        expect(formatPhoneNumber(input)).toBe(expected)
    })

    it.each([
        ['011123', '011-123'],
        ['0111234', '011-123-4'],
        ['0111234567', '011-123-4567'],
        ['01912345678', '019-1234-5678'],
    ])('011 계열은 10자리면 3-3-4, 11자리면 3-4-4: %s → %s', (input, expected) => {
        expect(formatPhoneNumber(input)).toBe(expected)
    })

    it('11자리를 넘는 입력은 잘라낸다', () => {
        expect(formatPhoneNumber('010123456789999')).toBe('010-1234-5678')
    })
})

describe('normalizePhone', () => {
    it.each([[null], [undefined], ['']])('빈 값은 빈 문자열 (%s)', (input) => {
        expect(normalizePhone(input)).toBe('')
    })

    it('하이픈 유무와 관계없이 같은 정규형을 만든다', () => {
        expect(normalizePhone('01012345678')).toBe(normalizePhone('010-1234-5678'))
    })
})

describe('isValidMobilePhone', () => {
    it.each([
        ['010-1234-1234'],
        ['01012345678'],
        ['011-123-4567'],
        ['016-1234-5678'],
        ['019-123-4567'],
    ])('%s 허용', (input) => {
        expect(isValidMobilePhone(input)).toBe(true)
    })

    it.each([
        ['399-2039-3030', '없는 식별번호 — 모양만 맞다'],
        ['010-1', '자릿수 미달'],
        ['010-123-4567', '010은 가운데가 4자리여야 한다'],
        ['02-123-4567', '유선은 받지 않는다'],
        ['070-1234-5678', '인터넷전화는 받지 않는다'],
        ['01012345678901', '자릿수 초과'],
        ['', '빈 값'],
    ])('%s 거부 (%s)', (input) => {
        expect(isValidMobilePhone(input)).toBe(false)
    })
})

describe('isBlankPhone', () => {
    it.each([[''], [null], [undefined], [PHONE_PREFIX], ['010'], ['010-']])(
        '접두어만 남은 값은 미입력으로 본다 (%s)',
        (input) => {
            expect(isBlankPhone(input)).toBe(true)
        }
    )

    it.each([['010-1'], ['010-1234-5678'], ['011-123-4567']])('%s 는 입력된 값', (input) => {
        expect(isBlankPhone(input)).toBe(false)
    })
})

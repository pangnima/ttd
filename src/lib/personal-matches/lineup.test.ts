import { describe, expect, it } from 'vitest'
import { isLineupComplete, isLineupCompleteByRoles, isRecruiting, isSlotEmpty, isSlotOk } from './lineup'

describe('isSlotEmpty', () => {
    it('회원도 이름도 없으면 빈 슬롯 — 손잡이만 있어도 빈 슬롯', () => {
        expect(isSlotEmpty({ name: '', hand: '' })).toBe(true)
        expect(isSlotEmpty({ name: '  ', hand: 'right' })).toBe(true)
        expect(isSlotEmpty({ name: '김', hand: '' })).toBe(false)
        expect(isSlotEmpty({ userId: 'u', name: '', hand: '' })).toBe(false)
    })
})

describe('isSlotOk', () => {
    it('allowEmpty면 빈 슬롯 통과, 아니면 거부', () => {
        expect(isSlotOk({ name: '', hand: '' }, '', true)).toBe(true)
        expect(isSlotOk({ name: '', hand: '' }, '', false)).toBe(false)
    })
    it('부분 입력(이름만·NTRP 없음)은 allowEmpty여도 거부', () => {
        expect(isSlotOk({ name: '김', hand: 'right' }, '', true)).toBe(false)
        expect(isSlotOk({ name: '김', hand: '' }, '3.0', true)).toBe(false)
        expect(isSlotOk({ name: '김', hand: 'right' }, '3.0', true)).toBe(true)
    })
    it('NTRP 숨김(확인 플로우 회원)은 NTRP 면제', () => {
        expect(isSlotOk({ userId: 'u', name: '회원', hand: '' }, '', false, true)).toBe(true)
    })
})

describe('isLineupComplete', () => {
    it('단식은 상대만, 복식은 3명 모두', () => {
        expect(isLineupComplete({ matchType: 'singles', opponentName: '상대' })).toBe(true)
        expect(isLineupComplete({ matchType: 'singles', opponentName: ' ' })).toBe(false)
        expect(isLineupComplete({ matchType: 'men_doubles', opponentName: '상대', partnerName: '파트너' })).toBe(false)
        expect(isLineupComplete({ matchType: 'men_doubles', opponentName: '상대', partnerName: '파트너', opponent2Name: '상대2' })).toBe(true)
    })
    it('role 목록 기준도 동일', () => {
        expect(isLineupCompleteByRoles('singles', ['opponent'])).toBe(true)
        expect(isLineupCompleteByRoles('men_doubles', ['opponent', 'partner'])).toBe(false)
        expect(isLineupCompleteByRoles('mixed_doubles', ['opponent', 'partner', 'opponent2'])).toBe(true)
    })
})

describe('isRecruiting', () => {
    const base = { roomId: 'r', setScores: [], matchType: 'singles' as const, opponentName: '' }
    it('노출 + 결과 없음 + 라인업 미완성일 때만', () => {
        expect(isRecruiting(base)).toBe(true)
        expect(isRecruiting({ ...base, roomId: undefined })).toBe(false)
        expect(isRecruiting({ ...base, setScores: [{ me: 6, opp: 3 }] })).toBe(false)
        expect(isRecruiting({ ...base, opponentName: '상대' })).toBe(false)
    })
})

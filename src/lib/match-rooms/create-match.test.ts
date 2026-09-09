import { describe, it, expect } from 'vitest'
import {
    MATCH_ROOM_INVITE_MAX,
    defaultMatchTypeOf,
    isMatchTypeAllowed,
    sourceKindOf,
    validateCreateMatchRoomInput,
    type CreateMatchRoomInput,
} from './create-match'

function input(over: Partial<CreateMatchRoomInput> = {}): CreateMatchRoomInput {
    return {
        format: 'singles',
        matchType: 'singles',
        playedAt: '2026-09-20',
        playedTime: '19:00',
        surface: 'hard',
        password: '1234',
        inviteUserIds: [],
        ...over,
    }
}

describe('sourceKindOf — 방식이 seed 종류를 정한다', () => {
    // 복식은 곧 로테이션이다 — 페어 고정은 "매 게임 같은 파트너"라는 빌더의 특수 케이스일 뿐이라
    // 별도 방식으로 두지 않는다.
    it('복식은 rotation_sessions를 seed로 쓴다', () => {
        expect(sourceKindOf('doubles')).toBe('rotation')
    })

    it('단식은 참가자 없는 direct 기록이 seed다', () => {
        expect(sourceKindOf('singles')).toBe('direct')
    })
})

describe('isMatchTypeAllowed / defaultMatchTypeOf', () => {
    it('단식은 singles만 허용한다', () => {
        expect(isMatchTypeAllowed('singles', 'singles')).toBe(true)
        expect(isMatchTypeAllowed('singles', 'men_doubles')).toBe(false)
    })

    it('복식은 복식 3종만 허용한다', () => {
        expect(isMatchTypeAllowed('doubles', 'men_doubles')).toBe(true)
        expect(isMatchTypeAllowed('doubles', 'women_doubles')).toBe(true)
        expect(isMatchTypeAllowed('doubles', 'mixed_doubles')).toBe(true)
        expect(isMatchTypeAllowed('doubles', 'singles')).toBe(false)
    })

    it('기본 경기 타입은 방식과 항상 정합한다', () => {
        for (const format of ['singles', 'doubles'] as const) {
            expect(isMatchTypeAllowed(format, defaultMatchTypeOf(format))).toBe(true)
        }
    })
})

describe('validateCreateMatchRoomInput', () => {
    it('참가자를 하나도 지목하지 않아도 통과한다 — 방부터 만들고 사람은 나중에 채운다', () => {
        expect(validateCreateMatchRoomInput(input())).toBeNull()
    })

    it('방식과 종목이 어긋나면 거부한다', () => {
        expect(validateCreateMatchRoomInput(input({ format: 'singles', matchType: 'men_doubles' }))).not.toBeNull()
        expect(validateCreateMatchRoomInput(input({ format: 'doubles', matchType: 'singles' }))).not.toBeNull()
    })

    it('날짜·시각·표면은 필수다', () => {
        expect(validateCreateMatchRoomInput(input({ playedAt: '' }))).not.toBeNull()
        expect(validateCreateMatchRoomInput(input({ playedTime: '' }))).not.toBeNull()
        expect(validateCreateMatchRoomInput(input({ playedTime: '19시' }))).not.toBeNull()
        expect(validateCreateMatchRoomInput(input({ surface: '' as never }))).not.toBeNull()
    })

    it('비밀번호는 항상 필수다 — 리스트에 노출되는 것이 매칭의 기본값이기 때문', () => {
        expect(validateCreateMatchRoomInput(input({ password: '' }))).not.toBeNull()
        expect(validateCreateMatchRoomInput(input({ password: '123' }))).not.toBeNull()
        expect(validateCreateMatchRoomInput(input({ password: 'abc def' }))).not.toBeNull()
    })

    it('코트명은 40자를 넘길 수 없다', () => {
        expect(validateCreateMatchRoomInput(input({ courtName: 'ㄱ'.repeat(40) }))).toBeNull()
        expect(validateCreateMatchRoomInput(input({ courtName: 'ㄱ'.repeat(41) }))).not.toBeNull()
    })

    it('같은 회원을 두 번 초대할 수 없다', () => {
        expect(validateCreateMatchRoomInput(input({ inviteUserIds: ['a', 'a'] }))).not.toBeNull()
        expect(validateCreateMatchRoomInput(input({ inviteUserIds: ['a', 'b'] }))).toBeNull()
    })

    it('초대 인원 상한을 넘기면 거부한다', () => {
        const ids = Array.from({ length: MATCH_ROOM_INVITE_MAX + 1 }, (_, i) => `u${i}`)
        expect(validateCreateMatchRoomInput(input({ inviteUserIds: ids }))).not.toBeNull()
        expect(validateCreateMatchRoomInput(input({ inviteUserIds: ids.slice(0, MATCH_ROOM_INVITE_MAX) }))).toBeNull()
    })
})

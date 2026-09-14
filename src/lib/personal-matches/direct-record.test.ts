import { describe, it, expect } from 'vitest'
import { requiresRoom, splitDirectPlayers, validateDirectRecordRoomInput, type DirectRecordRoomInput } from './direct-record'

describe('requiresRoom — 직접 기록의 경계', () => {
    it('비회원만 있으면 직접 기록할 수 있다 — 확인받을 상대가 없다', () => {
        expect(requiresRoom([{ }, { }])).toBe(false)
        expect(requiresRoom([])).toBe(false)
    })

    it('회원이 한 명이라도 끼면 매칭을 거쳐야 한다', () => {
        expect(requiresRoom([{ userId: 'u1' }])).toBe(true)
        expect(requiresRoom([{ }, { userId: 'u1' }, { }])).toBe(true)
    })

    it('빈 슬롯(모집 중)은 회원으로 치지 않는다', () => {
        expect(requiresRoom([{ userId: undefined }, { userId: '' }])).toBe(false)
    })
})

describe('splitDirectPlayers — 비노출 방에 넣을 사람 가르기(0082)', () => {
    it('회원은 초대 목록으로, 비회원은 등록 목록으로 간다', () => {
        const split = splitDirectPlayers([
            { userId: 'u1', name: '회원1' },
            { name: '게스트1', dominantHand: 'left', ntrp: 3 },
        ])
        expect(split.memberIds).toEqual(['u1'])
        expect(split.guests).toEqual([{ name: '게스트1', dominantHand: 'left', ntrp: 3 }])
    })

    it('같은 회원은 한 번만, 이름이 빈 비회원은 버린다', () => {
        const split = splitDirectPlayers([
            { userId: 'u1', name: '회원1' }, { userId: 'u1', name: '회원1' }, { name: '  ' },
        ])
        expect(split.memberIds).toEqual(['u1'])
        expect(split.guests).toEqual([])
    })
})

describe('validateDirectRecordRoomInput — 비노출 방 생성 검증', () => {
    const base: DirectRecordRoomInput = {
        matchType: 'singles', playedAt: '2026-09-20', playedTime: '19:00', surface: 'hard',
        durationMinutes: 120, courtCount: 1, players: [{ userId: 'u1', name: '회원1' }],
    }

    it('회원이 있으면 통과한다', () => {
        expect(validateDirectRecordRoomInput(base)).toBeNull()
    })

    it('회원이 없으면 방을 만들 이유가 없다', () => {
        expect(validateDirectRecordRoomInput({ ...base, players: [{ name: '게스트' }] })).not.toBeNull()
    })

    it('시간·면 수는 DB CHECK의 거울이다', () => {
        expect(validateDirectRecordRoomInput({ ...base, durationMinutes: 10 })).not.toBeNull()
        expect(validateDirectRecordRoomInput({ ...base, courtCount: 0 })).not.toBeNull()
    })
})

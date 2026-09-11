import { describe, expect, it } from 'vitest'
import { findKnownError, translateError, type ErrorMapEntry } from './error-map'

const ROOM: ErrorMapEntry[] = [
    ['not_room_member', '방에 참가한 뒤 게임을 등록할 수 있습니다.'],
    ['target_not_room_member', '이미 방에 없는 참가자입니다.'],
    ['member_has_games', '내보낼 수 없습니다.'],
    ['leave_member_has_games', '나갈 수 없습니다.'],
]

describe('error-map — 포함된 키 중 가장 긴 것을 고른다(F-pre-2)', () => {
    it('짧은 키가 목록 앞에 있어도 더 구체적인(긴) 키가 이긴다', () => {
        expect(translateError('rpc failed: target_not_room_member', ROOM, 'x')).toBe('이미 방에 없는 참가자입니다.')
        expect(translateError('rpc failed: leave_member_has_games', ROOM, 'x')).toBe('나갈 수 없습니다.')
    })

    it('짧은 키만 있으면 짧은 키를 고른다', () => {
        expect(translateError('rpc failed: not_room_member', ROOM, 'x')).toBe('방에 참가한 뒤 게임을 등록할 수 있습니다.')
        expect(translateError('rpc failed: member_has_games', ROOM, 'x')).toBe('내보낼 수 없습니다.')
    })

    it('목록 순서를 뒤집어도 결과가 같다', () => {
        const reversed = [...ROOM].reverse()
        for (const [key, msg] of ROOM) expect(translateError(`wrapped ${key} wrapped`, reversed, 'x')).toBe(msg)
    })

    it('모르는 메시지는 fallback, findKnownError는 undefined', () => {
        expect(translateError('something else', ROOM, '기본 문구')).toBe('기본 문구')
        expect(findKnownError('something else', ROOM)).toBeUndefined()
    })

    it('result_already_confirmed ⊂ result_already_confirmed_by_seat', () => {
        const RESULT: ErrorMapEntry[] = [
            ['result_already_confirmed', '이미 확정된 결과입니다.'],
            ['result_already_confirmed_by_seat', '이미 확인한 결과입니다.'],
        ]
        expect(findKnownError('result_already_confirmed_by_seat', RESULT)?.[0]).toBe('result_already_confirmed_by_seat')
        expect(findKnownError('result_already_confirmed', RESULT)?.[0]).toBe('result_already_confirmed')
    })
})

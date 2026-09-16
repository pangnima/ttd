import { describe, expect, it } from 'vitest'
import { findKnownError, translateError } from './error-map'
import { RESULT_ERROR_MESSAGES, ROOM_ERROR_MESSAGES, STALE_KEYS } from './error-messages'

// 화면이 감춘 버튼을 우회 호출해도 폴백이 아니라 사람 말이 나와야 한다 — 실제 맵을 두고 가드한다(F-pre-5·6)
describe('ROOM_ERROR_MESSAGES', () => {
    it.each([
        'not_member', 'invalid_duration', 'invalid_court_count', 'invalid_slot_minutes',
        'room_closed', 'room_not_settled', 'room_not_closed', 'room_already_closed', 'room_not_listed',
        'leave_member_has_games', 'member_has_games', 'lineup_locked', 'invalid_games',
    ])('%s 키가 있다', (key) => {
        expect(ROOM_ERROR_MESSAGES.some(([k]) => k === key)).toBe(true)
    })

    it('부분 문자열 관계의 키는 긴 쪽이 이긴다 — not_member ⊂ not_room_member ⊂ target_not_room_member', () => {
        expect(findKnownError('rpc: not_member', ROOM_ERROR_MESSAGES)?.[0]).toBe('not_member')
        expect(findKnownError('rpc: not_room_member', ROOM_ERROR_MESSAGES)?.[0]).toBe('not_room_member')
        expect(findKnownError('rpc: target_not_room_member', ROOM_ERROR_MESSAGES)?.[0]).toBe('target_not_room_member')
    })
})

describe('RESULT_ERROR_MESSAGES', () => {
    it('닫힌 방의 정정(room_closed)은 룸 맵과 같은 문구다', () => {
        const room = translateError('room_closed', ROOM_ERROR_MESSAGES, 'x')
        expect(translateError('rpc: room_closed', RESULT_ERROR_MESSAGES, 'x')).toBe(room)
    })

    it('stale 키는 전부 맵에 있다 — 없으면 팝업을 열어 둔 채 새로고침하는 분기가 죽는다', () => {
        for (const key of STALE_KEYS) expect(RESULT_ERROR_MESSAGES.some(([k]) => k === key)).toBe(true)
    })
})

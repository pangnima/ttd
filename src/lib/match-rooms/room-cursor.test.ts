import { describe, expect, it } from 'vitest'
import { encodeRoomCursor, parseRoomCursor, roomKeysetFilter, type RoomCursor } from './room-cursor'

const WITH_TIME: RoomCursor = { playedAt: '2026-09-05', playedTime: '18:00:00', id: 'dc0c0dac-30e9-4990-a863-6e947c5cd01c' }
const NO_TIME: RoomCursor = { playedAt: '2026-09-05', id: 'dc0c0dac-30e9-4990-a863-6e947c5cd01c' }

describe('encode/parseRoomCursor', () => {
    it('왕복하면 원본 그대로', () => {
        expect(parseRoomCursor(encodeRoomCursor(WITH_TIME))).toEqual(WITH_TIME)
        expect(parseRoomCursor(encodeRoomCursor(NO_TIME))).toEqual(NO_TIME)
    })

    it('시각 없는 커서는 가운데를 비운다', () => {
        expect(encodeRoomCursor(NO_TIME)).toBe('2026-09-05__dc0c0dac-30e9-4990-a863-6e947c5cd01c')
    })

    it('없거나 형식이 어긋나면 null (첫 페이지로 폴백)', () => {
        expect(parseRoomCursor(undefined)).toBeNull()
        expect(parseRoomCursor('')).toBeNull()
        expect(parseRoomCursor('2026-09-05_18:00:00')).toBeNull()          // 조각 부족
        expect(parseRoomCursor('20260905_18:00:00_' + NO_TIME.id)).toBeNull() // 날짜 형식
        expect(parseRoomCursor('2026-09-05_18:00:00_not-a-uuid')).toBeNull()  // id 형식
        expect(parseRoomCursor('2026-09-05_18h_' + NO_TIME.id)).toBeNull()    // 시각 형식
    })

    it('필터식을 조작하려는 값은 통과하지 못한다', () => {
        // 쉼표·괄호가 섞이면 or() 술어가 깨지므로 반드시 거부돼야 한다
        expect(parseRoomCursor('2026-09-05,is_settled.eq.false_18:00:00_' + NO_TIME.id)).toBeNull()
        expect(parseRoomCursor('2026-09-05_18:00:00_' + NO_TIME.id + ')')).toBeNull()
    })
})

describe('roomKeysetFilter — asc (진행 중, NULLS FIRST)', () => {
    it('시각 있는 커서: 날짜 > · 같은 날짜 시각 > · 동률은 id >', () => {
        expect(roomKeysetFilter(WITH_TIME, 'asc')).toBe(
            'played_at.gt.2026-09-05,'
            + 'and(played_at.eq.2026-09-05,played_time.gt.18:00:00),'
            + `and(played_at.eq.2026-09-05,played_time.eq.18:00:00,id.gt.${WITH_TIME.id})`,
        )
    })

    it('시각 없는 커서: 같은 날짜의 시각 있는 방이 아직 남아 있다', () => {
        expect(roomKeysetFilter(NO_TIME, 'asc')).toBe(
            'played_at.gt.2026-09-05,'
            + 'and(played_at.eq.2026-09-05,played_time.not.is.null),'
            + `and(played_at.eq.2026-09-05,played_time.is.null,id.gt.${NO_TIME.id})`,
        )
    })
})

describe('roomKeysetFilter — desc (종료, NULLS LAST)', () => {
    it('시각 있는 커서: 같은 날짜의 시각 없는 방이 뒤에 남아 있다', () => {
        expect(roomKeysetFilter(WITH_TIME, 'desc')).toBe(
            'played_at.lt.2026-09-05,'
            + 'and(played_at.eq.2026-09-05,played_time.lt.18:00:00),'
            + `and(played_at.eq.2026-09-05,played_time.eq.18:00:00,id.lt.${WITH_TIME.id}),`
            + 'and(played_at.eq.2026-09-05,played_time.is.null)',
        )
    })

    it('시각 없는 커서: 같은 날짜에서는 id만 더 내려간다', () => {
        expect(roomKeysetFilter(NO_TIME, 'desc')).toBe(
            'played_at.lt.2026-09-05,'
            + `and(played_at.eq.2026-09-05,played_time.is.null,id.lt.${NO_TIME.id})`,
        )
    })
})

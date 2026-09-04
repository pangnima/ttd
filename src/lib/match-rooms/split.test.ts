import { describe, expect, it } from 'vitest'
import { splitRoomsByDate, todayIsoKst } from './split'

const rooms = [
    { id: 'a', playedAt: '2026-09-10', playedTime: '18:00' },
    { id: 'b', playedAt: '2026-09-04', playedTime: '20:00' },
    { id: 'c', playedAt: '2026-09-04', playedTime: '09:00' },
    { id: 'd', playedAt: '2026-08-30' },
    { id: 'e', playedAt: '2026-09-01', playedTime: '10:00' },
]

describe('splitRoomsByDate', () => {
    it('오늘은 예정에 포함되고 예정은 가까운 순', () => {
        const { upcoming } = splitRoomsByDate(rooms, '2026-09-04')
        expect(upcoming.map((r) => r.id)).toEqual(['c', 'b', 'a'])
    })

    it('지난 경기는 최근순', () => {
        const { past } = splitRoomsByDate(rooms, '2026-09-04')
        expect(past.map((r) => r.id)).toEqual(['e', 'd'])
    })
})

describe('todayIsoKst', () => {
    it('UTC 자정 직전은 한국 기준 다음 날', () => {
        expect(todayIsoKst(new Date('2026-09-04T23:30:00Z'))).toBe('2026-09-05')
        expect(todayIsoKst(new Date('2026-09-04T10:00:00Z'))).toBe('2026-09-04')
    })
})

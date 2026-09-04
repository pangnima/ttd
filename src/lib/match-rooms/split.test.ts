import { describe, expect, it } from 'vitest'
import { splitRooms, todayIsoKst } from './split'

const rooms = [
    { id: 'a', playedAt: '2026-09-10', playedTime: '18:00', isSettled: false },
    { id: 'b', playedAt: '2026-09-04', playedTime: '20:00', isSettled: false },
    { id: 'c', playedAt: '2026-09-04', playedTime: '09:00', isSettled: false },
    { id: 'd', playedAt: '2026-08-30', isSettled: false },
    { id: 'e', playedAt: '2026-09-01', playedTime: '10:00', isSettled: false },
]

describe('splitRooms', () => {
    it('오늘은 예정에 포함되고 예정은 가까운 순', () => {
        const { upcoming } = splitRooms(rooms, '2026-09-04')
        expect(upcoming.map((r) => r.id)).toEqual(['c', 'b', 'a'])
    })

    it('지난 경기는 최근순', () => {
        const { past } = splitRooms(rooms, '2026-09-04')
        expect(past.map((r) => r.id)).toEqual(['e', 'd'])
    })

    it('결과가 확정되면 날짜가 남아 있어도 지난 경기', () => {
        const settled = rooms.map((r) => (r.id === 'a' ? { ...r, isSettled: true } : r))
        const { upcoming, past } = splitRooms(settled, '2026-09-04')
        expect(upcoming.map((r) => r.id)).toEqual(['c', 'b'])
        expect(past.map((r) => r.id)).toEqual(['a', 'e', 'd'])
    })

    it('날짜가 지난 방은 미확정이어도 지난 경기', () => {
        const { past } = splitRooms([{ playedAt: '2026-09-01', isSettled: false }], '2026-09-04')
        expect(past).toHaveLength(1)
    })
})

describe('todayIsoKst', () => {
    it('UTC 자정 직전은 한국 기준 다음 날', () => {
        expect(todayIsoKst(new Date('2026-09-04T23:30:00Z'))).toBe('2026-09-05')
        expect(todayIsoKst(new Date('2026-09-04T10:00:00Z'))).toBe('2026-09-04')
    })
})

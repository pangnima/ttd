import { describe, it, expect } from 'vitest'
import { findScheduleConflicts, type ScheduleSlot } from '@/lib/personal-matches/schedule-conflict'

const slots: ScheduleSlot[] = [
    { playedAt: '2026-09-07', playedTime: '19:00', label: '남자08' },
    { playedAt: '2026-09-07', playedTime: '21:00', label: '남자13' },
    { playedAt: '2026-09-08', playedTime: '19:00', label: '로테이션 경기' },
    { playedAt: '2026-09-07', label: '시각 미정' },
]

describe('findScheduleConflicts', () => {
    it('같은 날짜·시각만 잡는다', () => {
        expect(findScheduleConflicts(slots, '2026-09-07', '19:00').map((s) => s.label)).toEqual(['남자08'])
    })

    it('날짜가 다르면 시각이 같아도 충돌이 아니다', () => {
        expect(findScheduleConflicts(slots, '2026-09-09', '19:00')).toEqual([])
    })

    it('시각 미정 슬롯은 판정에서 빠진다', () => {
        expect(findScheduleConflicts(slots, '2026-09-07', '')).toEqual([])
        expect(findScheduleConflicts(slots, '2026-09-07', '20:00')).toEqual([])
    })

    it('초 단위까지 온 값도 같은 시각으로 본다 (Postgres time은 HH:MM:SS)', () => {
        const withSeconds: ScheduleSlot[] = [{ playedAt: '2026-09-07', playedTime: '19:00:00', label: 'DB 값' }]
        expect(findScheduleConflicts(withSeconds, '2026-09-07', '19:00')).toHaveLength(1)
    })

    it('날짜가 비어 있으면 판정하지 않는다', () => {
        expect(findScheduleConflicts(slots, '', '19:00')).toEqual([])
    })
})

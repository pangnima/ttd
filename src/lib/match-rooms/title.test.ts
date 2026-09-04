import { describe, expect, it } from 'vitest'
import { buildRoomTitle } from './title'
import { formatShortDate } from '@/lib/format'
import { MATCH_TYPE_LABELS } from '@/lib/dashboard/match-type-style'

const date = formatShortDate('2026-09-12')

describe('buildRoomTitle', () => {
    it('일시 · 코트명 · 경기 타입 순으로 조합한다', () => {
        expect(buildRoomTitle({ playedAt: '2026-09-12', playedTime: '18:00', courtName: '올림픽공원 3번 코트', matchType: 'men_doubles' }))
            .toBe(`${date} 18시 · 올림픽공원 3번 코트 · ${MATCH_TYPE_LABELS.men_doubles}`)
    })

    it('코트명이 없거나 공백이면 생략한다', () => {
        expect(buildRoomTitle({ playedAt: '2026-09-12', playedTime: '09:00', courtName: '  ', matchType: 'singles' }))
            .toBe(`${date} 9시 · ${MATCH_TYPE_LABELS.singles}`)
    })

    it('시각이 없으면 날짜만 쓴다', () => {
        expect(buildRoomTitle({ playedAt: '2026-09-12', matchType: 'mixed_doubles' }))
            .toBe(`${date} · ${MATCH_TYPE_LABELS.mixed_doubles}`)
    })
})

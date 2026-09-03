import { describe, expect, it } from 'vitest'
import type { PersonalMatchWinner } from '@/types'
import type { SettledPersonalMatch } from '@/lib/personal-matches/winner'
import {
    listMatchYears,
    aggregateWeekdayStats,
    aggregateWeekOfYearStats,
    aggregateMonthOfYearStats,
} from './trend-stats'

const ME = 'me'

function personal(id: string, playedAt: string, winner: PersonalMatchWinner): SettledPersonalMatch {
    return { id, userId: ME, opponentName: 'X', playedAt, matchType: 'singles', setScores: [{ me: 6, opp: 4 }], winner, createdAt: playedAt }
}

const NO_CLUB = { matches: [], gameMetaById: {} as Record<string, { date: string }> }

describe('listMatchYears', () => {
    it('연도 중복 제거 + 내림차순', () => {
        const years = listMatchYears({
            ...NO_CLUB,
            personalMatches: [
                personal('a', '2024-06-14', 'me'),
                personal('b', '2026-01-10', 'opponent'),
                personal('c', '2024-12-31', 'me'),
            ],
        }, ME)
        expect(years).toEqual([2026, 2024])
    })
    it('빈 입력은 빈 배열', () => {
        expect(listMatchYears({ ...NO_CLUB, personalMatches: [] }, ME)).toEqual([])
    })
})

describe('aggregateWeekdayStats (요일별)', () => {
    it('항상 7포인트(월~일), 같은 요일은 합산', () => {
        // 2026-06-15(월), 2026-06-22(월) → 월요일 버킷에 2경기
        const r = aggregateWeekdayStats({
            ...NO_CLUB,
            personalMatches: [personal('a', '2026-06-15', 'me'), personal('b', '2026-06-22', 'opponent')],
        }, ME, 2026)
        expect(r.points.map((p) => p.label)).toEqual(['월', '화', '수', '목', '금', '토', '일'])
        expect(r.points[0].total).toBe(2)   // 월
        expect(r.points[0].wins).toBe(1)
        expect(r.points[0].losses).toBe(1)
        expect(r.points[6].total).toBe(0)   // 일
    })
    it('다른 연도 경기는 제외', () => {
        const r = aggregateWeekdayStats({
            ...NO_CLUB,
            personalMatches: [personal('a', '2026-06-15', 'me'), personal('b', '2025-06-16', 'me')],
        }, ME, 2026)
        expect(r.totalGames).toBe(1)
    })
})

describe('aggregateWeekOfYearStats (주차별)', () => {
    it('1주 경계(1/1~1/7=1주, 1/8=2주) + 빈 주 0 채움', () => {
        const r = aggregateWeekOfYearStats({
            ...NO_CLUB,
            personalMatches: [
                personal('a', '2026-01-01', 'me'),   // 1주
                personal('b', '2026-01-15', 'opponent'), // 3주
            ],
        }, ME, 2026)
        expect(r.points.map((p) => p.label)).toEqual(['1주', '2주', '3주'])
        expect(r.points[0].total).toBe(1)
        expect(r.points[1].total).toBe(0)   // 빈 2주
        expect(r.points[2].total).toBe(1)
    })
    it('같은 주는 합산', () => {
        // 1/1(목)과 1/7(수)은 같은 1주
        const r = aggregateWeekOfYearStats({
            ...NO_CLUB,
            personalMatches: [personal('a', '2026-01-01', 'me'), personal('b', '2026-01-07', 'me')],
        }, ME, 2026)
        expect(r.points).toHaveLength(1)
        expect(r.points[0].label).toBe('1주')
        expect(r.points[0].total).toBe(2)
        expect(r.points[0].winRate).toBe(100)
    })
})

describe('aggregateMonthOfYearStats (월별)', () => {
    it('항상 12포인트(1~12월), 빈 달 0', () => {
        const r = aggregateMonthOfYearStats({
            ...NO_CLUB,
            personalMatches: [personal('a', '2026-01-10', 'me'), personal('b', '2026-03-10', 'opponent')],
        }, ME, 2026)
        expect(r.points).toHaveLength(12)
        expect(r.points.map((p) => p.label)).toEqual(
            ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
        )
        expect(r.points[0].total).toBe(1)   // 1월
        expect(r.points[1].total).toBe(0)   // 2월
        expect(r.points[2].total).toBe(1)   // 3월
        expect(r.bestPoint?.label).toBe('1월')
    })
    it('다른 연도 제외', () => {
        const r = aggregateMonthOfYearStats({
            ...NO_CLUB,
            personalMatches: [personal('a', '2026-06-10', 'me'), personal('b', '2025-06-10', 'me')],
        }, ME, 2026)
        expect(r.totalGames).toBe(1)
    })
})

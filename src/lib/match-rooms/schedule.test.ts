import { describe, expect, it } from 'vitest'
import {
    describeRecommendation,
    estimateMinutes,
    formatDurationLabel,
    formatRoomWhen,
    recommendGames,
} from '@/lib/match-rooms/schedule'

describe('formatDurationLabel', () => {
    it('시간과 분을 사람 말로 적는다', () => {
        expect(formatDurationLabel(120)).toBe('2시간')
        expect(formatDurationLabel(90)).toBe('1시간 30분')
        expect(formatDurationLabel(45)).toBe('45분')
    })

    it('값이 없으면 빈 문자열', () => {
        expect(formatDurationLabel(0)).toBe('')
        expect(formatDurationLabel(NaN)).toBe('')
    })
})

describe('formatRoomWhen', () => {
    it('소요 시간이 있으면 구간으로 적는다', () => {
        expect(formatRoomWhen('10:00', 120)).toBe('10:00~12:00')
        expect(formatRoomWhen('10:00', 150)).toBe('10:00~12:30')
    })

    it('초까지 온 값도 받는다 — DB time은 HH:MM:SS로 온다', () => {
        expect(formatRoomWhen('10:00:00', 120)).toBe('10:00~12:00')
    })

    it('자정을 넘으면 시각이 돌아간다', () => {
        expect(formatRoomWhen('22:00', 180)).toBe('22:00~01:00')
    })

    it('소요 시간을 모르는 방은 기존 표기 그대로 — 0073 이전 방', () => {
        expect(formatRoomWhen('10:00', null)).toBe('10시')
        expect(formatRoomWhen('09:00', undefined)).toBe('9시')
    })

    it('시각이 없으면 빈 문자열', () => {
        expect(formatRoomWhen(undefined, 120)).toBe('')
        expect(formatRoomWhen('', 120)).toBe('')
    })
})

describe('recommendGames — 시간과 코트 면 수로 권장 경기 수', () => {
    const base = { durationMinutes: 120, slotMinutes: 30, playerCount: 11, matchType: 'men_doubles' as const }

    // games는 "시간에 들어가는 최대"가 아니라 **그 1인당 값을 적용했을 때 실제로 만들어지는 수**다.
    // 코트 1면은 시간상 4경기가 들어가지만 11명이 1인당 1경기씩 뛰면 3경기가 된다(12자리 중 11명).
    it('코트 면 수만큼 경기가 늘어난다 — 같은 시간, 같은 인원', () => {
        expect(recommendGames({ ...base, courtCount: 1 })).toMatchObject({ rounds: 4, games: 3, perPlayer: 1 })
        expect(recommendGames({ ...base, courtCount: 2 })).toMatchObject({ rounds: 4, games: 8, perPlayer: 3 })
        // 3면을 골라도 11명으로는 세 번째 코트를 채울 4명이 없어 2면이 한계다 — 권장값도 2면 기준이다
        expect(recommendGames({ ...base, courtCount: 3 })).toMatchObject({ rounds: 4, courts: 2, games: 8, perPlayer: 3 })
        expect(recommendGames({ ...base, courtCount: 3, playerCount: 12 })).toMatchObject({ courts: 3, perPlayer: 4 })
    })

    it('권장대로 적용하면 예정 시간을 넘지 않는다 — 화면이 스스로를 반박하지 않게', () => {
        for (const courtCount of [1, 2, 3]) {
            for (const playerCount of [4, 6, 7, 9, 11, 14]) {
                const r = recommendGames({ ...base, courtCount, playerCount })
                if (!r) continue
                // 방의 면 수가 아니라 **실제로 돌릴 수 있는 면 수**로 재어야 한다 — 인원이 모자라면
                // 남는 코트는 비어 있고 그만큼 라운드가 늘어난다
                expect(estimateMinutes(r.games, base.slotMinutes, r.courts)).toBeLessThanOrEqual(base.durationMinutes)
            }
        }
    })

    it('단식은 한 경기에 두 자리라 1인당이 절반이다', () => {
        expect(recommendGames({ ...base, matchType: 'singles', courtCount: 2 })?.perPlayer).toBe(1)
    })

    it('소요 시간을 모르면 추천하지 않는다', () => {
        expect(recommendGames({ ...base, durationMinutes: null, courtCount: 2 })).toBeNull()
        expect(recommendGames({ ...base, durationMinutes: undefined, courtCount: 2 })).toBeNull()
    })

    // 시간이 모자라도 최소 구성(1인당 1경기)은 권한다 — 그러면 시간을 넘고, 그 사실은 화면이 따로 말한다
    it('경기 시간이 예정 시간보다 길면 최소 구성으로 내리고 말해 준다', () => {
        const r = recommendGames({ ...base, durationMinutes: 60, slotMinutes: 90, courtCount: 1 })
        expect(r).toMatchObject({ rounds: 1, perPlayer: 1 })
        expect(r?.notes[0]).toContain('예정 시간')
    })

    it('상한 20을 넘으면 깎고 말해 준다', () => {
        const r = recommendGames({ ...base, durationMinutes: 360, slotMinutes: 20, courtCount: 4 })
        expect(r?.games).toBe(20)
        expect(r?.notes.some((n) => n.includes('20'))).toBe(true)
    })

    it('1인당은 1~10 사이로 묶인다', () => {
        const few = recommendGames({ ...base, durationMinutes: 60, slotMinutes: 60, courtCount: 1, playerCount: 20 })
        expect(few?.perPlayer).toBe(1)
        const many = recommendGames({ ...base, durationMinutes: 600, slotMinutes: 20, courtCount: 6, playerCount: 4 })
        expect(many?.perPlayer).toBe(10)
    })

    it('대진을 만들 수 없는 인원이면 추천하지 않는다 — 호스트 혼자인 방에서 헛숫자가 나오지 않게', () => {
        expect(recommendGames({ ...base, courtCount: 2, playerCount: 0 })).toBeNull()
        expect(recommendGames({ ...base, courtCount: 2, playerCount: 3 })).toBeNull()
        expect(recommendGames({ ...base, courtCount: 2, playerCount: 4 })).not.toBeNull()
    })

    it('단식은 두 명부터 추천한다', () => {
        expect(recommendGames({ ...base, matchType: 'singles', courtCount: 1, playerCount: 1 })).toBeNull()
        expect(recommendGames({ ...base, matchType: 'singles', courtCount: 1, playerCount: 2 })).not.toBeNull()
    })
})

describe('describeRecommendation — 매칭 만들기 요약과 룸 힌트가 공유하는 한 문장', () => {
    const rec = { rounds: 4, courts: 2, games: 8, perPlayer: 3, notes: [] }

    it('고른 면 수를 다 쓰면 면 수를 말하지 않는다', () => {
        expect(describeRecommendation({ recommendation: rec, courtCount: 2, playerCount: 11 }))
            .toBe('참가 예정 11명이면 1인당 3경기 권장')
    })

    it('인원이 모자라 실효 면 수가 깎이면 "M면 기준"을 밝힌다', () => {
        expect(describeRecommendation({ recommendation: rec, courtCount: 3, playerCount: 11 }))
            .toBe('참가 예정 11명이면 2면 기준 1인당 3경기 권장')
    })

    it('recommendGames의 결과를 그대로 받는다', () => {
        const r = recommendGames({ durationMinutes: 120, slotMinutes: 30, courtCount: 3, playerCount: 11, matchType: 'men_doubles' })
        expect(r).not.toBeNull()
        expect(describeRecommendation({ recommendation: r!, courtCount: 3, playerCount: 11 })).toContain('2면 기준')
    })
})

describe('estimateMinutes — 이 대진에 걸리는 시간', () => {
    it('코트 면 수만큼 동시에 돈다', () => {
        expect(estimateMinutes(8, 30, 2)).toBe(120)
        expect(estimateMinutes(8, 30, 1)).toBe(240)
    })

    it('나누어떨어지지 않으면 올림 — 마지막 순번도 코트를 쓴다', () => {
        expect(estimateMinutes(7, 30, 2)).toBe(120)
        expect(estimateMinutes(9, 30, 2)).toBe(150)
    })

    it('경기가 없으면 0', () => {
        expect(estimateMinutes(0, 30, 2)).toBe(0)
    })
})

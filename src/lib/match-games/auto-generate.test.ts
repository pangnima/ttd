import { describe, expect, it } from 'vitest'
import type { MatchType, User } from '@/types'
import { computeDefaultNtrp, generateMatchGame, type CourtConfig, type GenerateResult } from './auto-generate'

/**
 * 자동 대진표 생성기의 **골든 테스트**.
 *
 * generateMatchGame은 Math.random을 엔트리 id에만 쓰므로 배치 자체는 완전히 결정적이다.
 * 그래서 "이 입력이 이 대진을 낸다"를 통째로 박아 둘 수 있고, 코어를 추출하는 리팩터링이
 * 동작을 바꾸지 않았다는 증명이 이 파일이 된다.
 *
 * ⚠ 여기 박힌 대진은 "이상적인 답"이 아니라 **현재 동작**이다. 알고리즘을 의도적으로 개선할 때는
 * 기대값을 갱신하되 무엇이 왜 좋아졌는지 커밋 메시지에 남긴다.
 */

function u(id: string, gender: 'male' | 'female', ntrp: number): User {
    return {
        id,
        email: `${id}@example.com`,
        name: id,
        nickname: id,
        role: 'member',
        phone: '',
        gender,
        dominantHand: 'right',
        ntrp,
        tennisStartDate: '2020-01-01',
        createdAt: '2026-01-01T00:00:00Z',
        isGuest: false,
        statsHidden: false,
    }
}

const M = (n: number, ntrp: number) => u(`m${n}`, 'male', ntrp)
const F = (n: number, ntrp: number) => u(`f${n}`, 'female', ntrp)

// NTRP를 일부러 흩뜨려 둔 고정 참석자 — 실력 밴딩이 도는지 보려면 폭이 있어야 한다
const MEN = [M(1, 4.0), M(2, 3.5), M(3, 3.0), M(4, 2.5), M(5, 4.5), M(6, 3.5), M(7, 3.0), M(8, 2.0)]
const WOMEN = [F(1, 3.5), F(2, 3.0), F(3, 2.5), F(4, 4.0), F(5, 2.0), F(6, 3.5), F(7, 3.0), F(8, 2.5)]

const court = (id: string, label: string, matchType: MatchType): CourtConfig => ({
    id,
    label,
    surface: 'hard',
    matchType,
})

type SlimEntry = {
    courtId: string
    startAt: string
    endAt: string
    matchType: MatchType
    player1Id: string
    player2Id: string
    team1: [string, string]
    team2: [string, string]
}

/** id는 genId(Math.random)라 비교에서 뺀다 — 나머지 필드가 배치의 전부다 */
function slim(result: GenerateResult): SlimEntry[] {
    return result.entries.map(({ courtId, startAt, endAt, matchType, player1Id, player2Id, team1, team2 }) => ({
        courtId,
        startAt,
        endAt,
        matchType,
        player1Id,
        player2Id,
        team1,
        team2,
    }))
}

function dbl(
    courtId: string,
    startAt: string,
    endAt: string,
    matchType: MatchType,
    team1: [string, string],
    team2: [string, string],
): SlimEntry {
    return { courtId, startAt, endAt, matchType, player1Id: '', player2Id: '', team1, team2 }
}

function sgl(courtId: string, startAt: string, endAt: string, player1Id: string, player2Id: string): SlimEntry {
    return {
        courtId,
        startAt,
        endAt,
        matchType: 'singles',
        player1Id,
        player2Id,
        team1: ['', ''],
        team2: ['', ''],
    }
}

const playersOf = (e: SlimEntry) => (e.matchType === 'singles' ? [e.player1Id, e.player2Id] : [...e.team1, ...e.team2])

describe('generateMatchGame — 골든 대진', () => {
    it('남복 1코트 3라운드 (남 8명)', () => {
        const result = generateMatchGame({
            courts: [court('c1', '1번', 'men_doubles')],
            rounds: 3,
            baseStart: '09:00',
            slotMinutes: 60,
            attendees: MEN,
        })
        expect(result.warnings).toEqual([])
        expect(slim(result)).toEqual([
            dbl('c1', '09:00', '10:00', 'men_doubles', ['m3', 'm2'], ['m7', 'm6']),
            dbl('c1', '10:00', '11:00', 'men_doubles', ['m8', 'm5'], ['m4', 'm1']),
            dbl('c1', '11:00', '12:00', 'men_doubles', ['m8', 'm1'], ['m3', 'm7']),
        ])
    })

    it('여복 1코트 3라운드 (여 8명)', () => {
        const result = generateMatchGame({
            courts: [court('c1', '1번', 'women_doubles')],
            rounds: 3,
            baseStart: '09:00',
            slotMinutes: 60,
            attendees: WOMEN,
        })
        expect(result.warnings).toEqual([])
        expect(slim(result)).toEqual([
            dbl('c1', '09:00', '10:00', 'women_doubles', ['f3', 'f2'], ['f8', 'f7']),
            dbl('c1', '10:00', '11:00', 'women_doubles', ['f1', 'f6'], ['f4', 'f2']),
            dbl('c1', '11:00', '12:00', 'women_doubles', ['f5', 'f1'], ['f3', 'f7']),
        ])
    })

    it('혼복 1코트 3라운드 (남 4·여 4)', () => {
        const result = generateMatchGame({
            courts: [court('c1', '1번', 'mixed_doubles')],
            rounds: 3,
            baseStart: '10:00',
            slotMinutes: 90,
            attendees: [...MEN.slice(0, 4), ...WOMEN.slice(0, 4)],
        })
        expect(result.warnings).toEqual([])
        expect(slim(result)).toEqual([
            dbl('c1', '10:00', '11:30', 'mixed_doubles', ['m4', 'f2'], ['m3', 'f3']),
            dbl('c1', '11:30', '13:00', 'mixed_doubles', ['m2', 'f4'], ['m1', 'f1']),
            dbl('c1', '13:00', '14:30', 'mixed_doubles', ['m4', 'f4'], ['m2', 'f2']),
        ])
    })

    it('단식 1코트 3라운드 — 성별을 가리지 않는다', () => {
        const result = generateMatchGame({
            courts: [court('c1', '1번', 'singles')],
            rounds: 3,
            baseStart: '08:00',
            slotMinutes: 45,
            attendees: [...MEN.slice(0, 3), ...WOMEN.slice(0, 3)],
        })
        expect(result.warnings).toEqual([])
        expect(slim(result)).toEqual([
            sgl('c1', '08:00', '08:45', 'm3', 'f2'),
            sgl('c1', '08:45', '09:30', 'm2', 'f1'),
            sgl('c1', '09:30', '10:15', 'm3', 'f3'),
        ])
    })

    it('단식+남복 2코트 2라운드 — 빡빡한 종류를 먼저 배정하고 entries는 코트 순서로 되돌린다', () => {
        // 남복이 남성을 먼저 가져가므로 2라운드 단식은 남는 여성 둘이 맡는다
        const result = generateMatchGame({
            courts: [court('c1', '1번', 'singles'), court('c2', '2번', 'men_doubles')],
            rounds: 2,
            baseStart: '09:00',
            slotMinutes: 60,
            attendees: [...MEN, ...WOMEN.slice(0, 2)],
        })
        expect(result.warnings).toEqual([])
        expect(slim(result)).toEqual([
            sgl('c1', '09:00', '10:00', 'm4', 'm8'),
            dbl('c2', '09:00', '10:00', 'men_doubles', ['m3', 'm2'], ['m7', 'm6']),
            sgl('c1', '10:00', '11:00', 'f1', 'f2'),
            dbl('c2', '10:00', '11:00', 'men_doubles', ['m1', 'm2'], ['m5', 'm3']),
        ])
    })

    it('인원이 부족하면 그 슬롯만 건너뛰고 라운드별 warning을 남긴다', () => {
        const result = generateMatchGame({
            courts: [court('c1', '1번', 'men_doubles')],
            rounds: 2,
            baseStart: '09:00',
            slotMinutes: 60,
            attendees: MEN.slice(0, 3),
        })
        expect(result.entries).toEqual([])
        expect(result.warnings).toEqual([
            '1라운드 1번(남복): 인원이 부족해 경기를 생성하지 못했습니다.',
            '2라운드 1번(남복): 인원이 부족해 경기를 생성하지 못했습니다.',
        ])
    })

    it('코트/라운드/참석자가 비면 각각의 안내만 내고 끝낸다', () => {
        const base = { rounds: 1, baseStart: '09:00', slotMinutes: 60, attendees: MEN }
        const c = [court('c1', '1번', 'men_doubles')]
        expect(generateMatchGame({ ...base, courts: [] }).warnings).toEqual(['코트를 1개 이상 추가해주세요.'])
        expect(generateMatchGame({ ...base, courts: c, rounds: 0 }).warnings).toEqual([
            '라운드 수를 1 이상으로 지정해주세요.',
        ])
        expect(generateMatchGame({ ...base, courts: c, attendees: [] }).warnings).toEqual([
            '참석자를 1명 이상 등록해주세요.',
        ])
    })

    it('courts는 입력 코트를 그대로 폼 코트로 옮긴다', () => {
        const result = generateMatchGame({
            courts: [court('c1', '1번', 'men_doubles')],
            rounds: 1,
            baseStart: '09:00',
            slotMinutes: 60,
            attendees: MEN,
        })
        expect(result.courts).toEqual([{ id: 'c1', label: '1번', surface: 'hard', matchType: 'men_doubles' }])
    })
})

describe('generateMatchGame — 성질', () => {
    const config = {
        courts: [court('c1', '1번', 'men_doubles'), court('c2', '2번', 'women_doubles'), court('c3', '3번', 'singles')],
        rounds: 4,
        baseStart: '09:00',
        slotMinutes: 60,
        attendees: [...MEN, ...WOMEN],
    }

    it('한 라운드 안에서 같은 사람이 두 경기에 들어가지 않는다', () => {
        const byRound = new Map<string, string[]>()
        for (const e of slim(generateMatchGame(config))) {
            byRound.set(e.startAt, [...(byRound.get(e.startAt) ?? []), ...playersOf(e)])
        }
        for (const [startAt, ids] of byRound) {
            expect(new Set(ids).size, `${startAt} 중복 배정`).toBe(ids.length)
        }
    })

    it('성별 고정 코트는 하드 제약이다 — 남복에 여성, 여복에 남성이 없다', () => {
        for (const e of slim(generateMatchGame(config))) {
            if (e.matchType === 'men_doubles') {
                expect(playersOf(e).every((id) => id.startsWith('m'))).toBe(true)
            }
            if (e.matchType === 'women_doubles') {
                expect(playersOf(e).every((id) => id.startsWith('f'))).toBe(true)
            }
        }
    })

    it('혼복은 팀마다 1남1녀다', () => {
        const result = generateMatchGame({
            courts: [court('c1', '1번', 'mixed_doubles')],
            rounds: 4,
            baseStart: '09:00',
            slotMinutes: 60,
            attendees: [...MEN.slice(0, 4), ...WOMEN.slice(0, 4)],
        })
        for (const e of slim(result)) {
            for (const team of [e.team1, e.team2]) {
                expect(team.filter((id) => id.startsWith('m')).length).toBe(1)
                expect(team.filter((id) => id.startsWith('f')).length).toBe(1)
            }
        }
    })

    it('같은 입력은 같은 대진을 낸다 — Math.random은 엔트리 id에만 쓰인다', () => {
        expect(slim(generateMatchGame(config))).toEqual(slim(generateMatchGame(config)))
        const ids = generateMatchGame(config).entries.map((e) => e.id)
        expect(ids).not.toEqual(generateMatchGame(config).entries.map((e) => e.id))
    })
})

describe('computeDefaultNtrp', () => {
    it('평점 보유자(> 0)의 평균을 쓴다', () => {
        expect(computeDefaultNtrp([M(1, 3.0), M(2, 4.0)])).toBe(3.5)
    })

    it('0(미입력·게스트)은 평균에서 제외한다', () => {
        expect(computeDefaultNtrp([M(1, 3.0), M(2, 4.0), M(3, 0)])).toBe(3.5)
    })

    it('아무도 평점이 없으면 3.0으로 떨어진다', () => {
        expect(computeDefaultNtrp([M(1, 0), F(1, 0)])).toBe(3.0)
        expect(computeDefaultNtrp([])).toBe(3.0)
    })
})

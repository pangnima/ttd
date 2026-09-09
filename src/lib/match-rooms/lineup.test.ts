import { describe, expect, it } from 'vitest'
import type { LineupPlayer } from '@/lib/match-games/lineup-core'
import { teamDiff } from '@/lib/match-games/lineup-core'
import {
    ROOM_LINEUP_MAX_GAMES,
    buildRoomLineup,
    gamesForPerPlayer,
    toLineupPlayers,
    type LineupGame,
    type LineupPreset,
} from './lineup'

function p(key: string, gender: 'male' | 'female', ntrp: number, isMember = true): LineupPlayer {
    return { key, name: key, ntrp, gender, isMember }
}

// 회원 6명 — 실력 폭이 있어야 프리셋 차이가 드러난다
const SIX = [
    p('a', 'male', 4.0),
    p('b', 'male', 3.5),
    p('c', 'male', 3.0),
    p('d', 'male', 2.5),
    p('e', 'male', 4.5),
    p('f', 'male', 2.0),
]

const keysOf = (g: LineupGame) => [...g.team1, ...g.team2].map((x) => x.key)

describe('toLineupPlayers — 방 참가자를 배치 대상으로', () => {
    it('NTRP는 personalNtrp ?? ntrp — 룸 풀(rotation-pool)과 같은 우선순위다', () => {
        const [a, b] = toLineupPlayers([
            { id: 'a', name: 'A', ntrp: 3.0, personalNtrp: 4.2, isGuest: false },
            { id: 'b', name: 'B', ntrp: 2.5, isGuest: false },
        ])
        expect(a.ntrp).toBe(4.2)
        expect(b.ntrp).toBe(2.5)
    })

    it('평점이 없는 참가자는 아는 사람들의 평균으로 채운다 — 평점이 없다고 빠지면 안 된다', () => {
        const players = toLineupPlayers([
            { id: 'a', name: 'A', ntrp: 3.0, isGuest: false },
            { id: 'b', name: 'B', ntrp: 4.0, isGuest: false },
            { id: 'c', name: 'C', isGuest: false },
        ])
        expect(players[2].ntrp).toBe(3.5)
    })

    it('아무도 평점이 없으면 3.0으로 떨어진다', () => {
        expect(toLineupPlayers([{ id: 'a', name: 'A', isGuest: false }])[0].ntrp).toBe(3.0)
    })

    it('게스트는 회원이 아니다 — 각 팀 회원 최소 1명 제약의 판정 근거', () => {
        const [member, guest] = toLineupPlayers([
            { id: 'a', name: 'A', ntrp: 3.0, gender: 'male', isGuest: false },
            { id: 'g', name: 'G', ntrp: 3.0, gender: 'female', isGuest: true },
        ])
        expect(member.isMember).toBe(true)
        expect(guest.isMember).toBe(false)
        expect(guest.gender).toBe('female')
    })
})

describe('gamesForPerPlayer — 1인당 경기 수를 총 게임 수로 환산', () => {
    it('복식은 게임당 4자리', () => {
        expect(gamesForPerPlayer(4, 3, true)).toBe(3)
        expect(gamesForPerPlayer(6, 2, true)).toBe(3)
        expect(gamesForPerPlayer(8, 3, true)).toBe(6)
    })

    it('단식은 게임당 2자리', () => {
        expect(gamesForPerPlayer(4, 2, false)).toBe(4)
        expect(gamesForPerPlayer(2, 3, false)).toBe(3)
    })

    it('나누어떨어지지 않으면 반올림하고 1 이상 상한 이하로 묶는다', () => {
        expect(gamesForPerPlayer(5, 2, true)).toBe(3) // 10 / 4 = 2.5 → 3
        expect(gamesForPerPlayer(4, 1, true)).toBe(1)
        expect(gamesForPerPlayer(20, 6, true)).toBe(ROOM_LINEUP_MAX_GAMES)
        expect(gamesForPerPlayer(0, 3, true)).toBe(0)
        expect(gamesForPerPlayer(6, 0, true)).toBe(0)
    })
})

describe('buildRoomLineup — 대진의 불변식', () => {
    const build = (preset: LineupPreset = 'balanced', seed = 1, games = 6) =>
        buildRoomLineup(SIX, { matchType: 'men_doubles', games, preset, seed })

    it('한 경기에 같은 사람이 두 번 들어가지 않는다', () => {
        for (const g of build().games) {
            expect(new Set(keysOf(g)).size).toBe(4)
        }
    })

    it('출전 횟수 편차가 1을 넘지 않는다 — 룸에서 「골고루 뛴다」는 눈에 보이는 약속이다', () => {
        for (const games of [3, 5, 6, 9]) {
            const counts = Object.values(build('balanced', 7, games).playCounts)
            expect(Math.max(...counts) - Math.min(...counts), `${games}게임`).toBeLessThanOrEqual(1)
        }
    })

    it('쉬는 사람은 그 경기에 없는 참가자 전원이다', () => {
        const result = build()
        expect(result.resting).toHaveLength(result.games.length)
        result.games.forEach((g, i) => {
            const playing = new Set(keysOf(g))
            expect(result.resting[i].sort()).toEqual(SIX.filter((x) => !playing.has(x.key)).map((x) => x.key).sort())
        })
    })

    it('각 팀에 회원이 최소 1명 — 저장되는 게임이 match_requests 행이기 때문', () => {
        const withGuests = [
            p('m1', 'male', 4.0),
            p('m2', 'male', 3.0),
            p('g1', 'male', 3.5, false),
            p('g2', 'male', 2.5, false),
            p('g3', 'male', 3.0, false),
        ]
        const result = buildRoomLineup(withGuests, { matchType: 'men_doubles', games: 4, preset: 'balanced', seed: 3 })
        expect(result.games.length).toBeGreaterThan(0)
        for (const g of result.games) {
            expect(g.team1.some((x) => x.isMember)).toBe(true)
            expect(g.team2.some((x) => x.isMember)).toBe(true)
        }
    })

    it('요청한 게임 수만큼 만든다', () => {
        expect(build('balanced', 1, 5).games).toHaveLength(5)
    })
})

describe('buildRoomLineup — 시드', () => {
    const build = (seed: number) =>
        buildRoomLineup(SIX, { matchType: 'men_doubles', games: 5, preset: 'balanced', seed })

    const shape = (seed: number) => build(seed).games.map((g) => [...keysOf(g)].join('|'))

    it('같은 시드는 같은 대진을 낸다', () => {
        expect(shape(42)).toEqual(shape(42))
    })

    it('시드를 바꾸면 대진이 바뀐다 — [다시 뽑기]가 실제로 작동한다', () => {
        const base = shape(1)
        const others = [2, 3, 4, 5, 6].map(shape)
        expect(others.some((s) => JSON.stringify(s) !== JSON.stringify(base))).toBe(true)
    })
})

describe('buildRoomLineup — 프리셋', () => {
    const totalDiff = (preset: LineupPreset, seed: number) =>
        buildRoomLineup(SIX, { matchType: 'men_doubles', games: 6, preset, seed }).games.reduce(
            (acc, g) => acc + teamDiff(g),
            0,
        )

    it('실력 균형 우선은 팀 전력차 총합이 균형보다 크지 않다', () => {
        for (const seed of [1, 2, 3, 4, 5]) {
            expect(totalDiff('skill', seed), `seed ${seed}`).toBeLessThanOrEqual(totalDiff('balanced', seed) + 1e-9)
        }
    })

    it('골고루 섞기 우선은 같은 파트너 반복이 균형보다 많지 않다', () => {
        const repeats = (preset: LineupPreset) => {
            const seen = new Map<string, number>()
            let repeated = 0
            for (const g of buildRoomLineup(SIX, { matchType: 'men_doubles', games: 6, preset, seed: 11 }).games) {
                for (const team of [g.team1, g.team2]) {
                    const key = team
                        .map((x) => x.key)
                        .sort()
                        .join('|')
                    const n = seen.get(key) ?? 0
                    if (n > 0) repeated++
                    seen.set(key, n + 1)
                }
            }
            return repeated
        }
        expect(repeats('variety')).toBeLessThanOrEqual(repeats('balanced'))
    })
})

describe('buildRoomLineup — 성별은 soft다', () => {
    it('혼복인데 성비가 안 맞아도 참가자를 빼지 않고, 대신 안내한다', () => {
        const lopsided = [
            p('m1', 'male', 3.5),
            p('m2', 'male', 3.0),
            p('m3', 'male', 4.0),
            p('f1', 'female', 3.0),
        ]
        const result = buildRoomLineup(lopsided, {
            matchType: 'mixed_doubles',
            games: 2,
            preset: 'balanced',
            seed: 5,
        })
        expect(result.games).toHaveLength(2)
        for (const g of result.games) {
            expect(new Set(keysOf(g)).size).toBe(4) // 4명뿐이라 전원 출전
        }
        expect(result.warnings.some((w) => w.includes('성별 구성'))).toBe(true)
    })

    it('성비가 맞으면 팀마다 1남1녀를 지킨다', () => {
        const balanced = [
            p('m1', 'male', 3.5),
            p('m2', 'male', 3.0),
            p('f1', 'female', 3.5),
            p('f2', 'female', 3.0),
        ]
        const result = buildRoomLineup(balanced, {
            matchType: 'mixed_doubles',
            games: 3,
            preset: 'balanced',
            seed: 9,
        })
        expect(result.warnings).toEqual([])
        for (const g of result.games) {
            for (const team of [g.team1, g.team2]) {
                expect(team.filter((x) => x.gender === 'male')).toHaveLength(1)
                expect(team.filter((x) => x.gender === 'female')).toHaveLength(1)
            }
        }
    })
})

describe('buildRoomLineup — 만들 수 없는 경우', () => {
    it('참가자가 인원에 못 미치면 이유를 말한다', () => {
        const result = buildRoomLineup(SIX.slice(0, 3), {
            matchType: 'men_doubles',
            games: 2,
            preset: 'balanced',
            seed: 1,
        })
        expect(result.games).toEqual([])
        expect(result.warnings).toEqual(['남자 복식 대진에는 참가자가 4명 이상 필요합니다.'])
    })

    it('회원이 1명뿐이면 팀을 나눌 수 없다', () => {
        const oneMember = [
            p('m1', 'male', 3.5),
            p('g1', 'male', 3.0, false),
            p('g2', 'male', 3.0, false),
            p('g3', 'male', 3.0, false),
        ]
        const result = buildRoomLineup(oneMember, {
            matchType: 'men_doubles',
            games: 2,
            preset: 'balanced',
            seed: 1,
        })
        expect(result.games).toEqual([])
        expect(result.warnings[0]).toContain('각 팀에 회원이 최소 1명씩')
    })

    it('경기 수가 0 이하면 만들지 않는다', () => {
        expect(
            buildRoomLineup(SIX, { matchType: 'men_doubles', games: 0, preset: 'balanced', seed: 1 }).warnings,
        ).toEqual(['경기 수를 1 이상으로 지정해주세요.'])
    })

    it('상한을 넘겨 요청하면 상한까지만 만들고 알린다', () => {
        const result = buildRoomLineup(SIX, {
            matchType: 'men_doubles',
            games: ROOM_LINEUP_MAX_GAMES + 5,
            preset: 'balanced',
            seed: 1,
        })
        expect(result.games).toHaveLength(ROOM_LINEUP_MAX_GAMES)
        expect(result.warnings[0]).toContain(`${ROOM_LINEUP_MAX_GAMES}개까지`)
    })
})

describe('buildRoomLineup — 단식', () => {
    it('단식은 게임마다 1대1이고 양쪽 다 회원이어야 한다', () => {
        const result = buildRoomLineup(SIX, { matchType: 'singles', games: 6, preset: 'balanced', seed: 2 })
        expect(result.games).toHaveLength(6)
        for (const g of result.games) {
            expect(g.team1).toHaveLength(1)
            expect(g.team2).toHaveLength(1)
            expect(g.team1[0].key).not.toBe(g.team2[0].key)
        }
        const counts = Object.values(result.playCounts)
        expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1)
    })
})

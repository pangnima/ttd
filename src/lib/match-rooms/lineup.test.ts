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
import { effectiveCourtCount, groupByRound } from '@/lib/match-rooms/court-slots'

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
    it('NTRP는 derivePublicNtrp — 개인 NTRP가 있으면 그것을 쓴다', () => {
        const [a, b] = toLineupPlayers([
            { id: 'a', name: 'A', ntrp: 3.0, personalNtrp: 4.2, isGuest: false },
            { id: 'b', name: 'B', ntrp: 2.5, isGuest: false },
        ])
        expect(a.ntrp).toBe(4.2)
        expect(b.ntrp).toBe(2.5)
    })

    it('통계 비공개 회원은 자가선언 값으로 배치된다 — 칩에 보이는 숫자와 같아야 한다', () => {
        const [a] = toLineupPlayers([
            { id: 'a', name: 'A', ntrp: 3.0, personalNtrp: 4.2, statsHidden: true, isGuest: false },
        ])
        expect(a.ntrp).toBe(3.0)
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

    it('회원이 둘 다 뛸 수 있는 게임은 양 팀으로 가르고, 편차 규칙이 한 명만 허락하면 자유 기록 게임이 된다(0076)', () => {
        const withGuests = [
            p('m1', 'male', 4.0),
            p('m2', 'male', 3.0),
            p('g1', 'male', 3.5, false),
            p('g2', 'male', 2.5, false),
            p('g3', 'male', 3.0, false),
        ]
        const result = buildRoomLineup(withGuests, { matchType: 'men_doubles', games: 4, preset: 'balanced', seed: 3 })
        // 0075까지는 편차 규칙이 4번째 게임에서 회원 한 명만 허락해 3게임에서 중단됐다 — 이제 그 게임은 자유 기록이다
        expect(result.games).toHaveLength(4)
        for (const g of result.games) {
            // 회원은 언제나 team1의 첫 자리(소유자·requester)
            expect(g.team1[0].isMember).toBe(true)
            const members = [...g.team1, ...g.team2].filter((x) => x.isMember)
            // 회원 둘이 같은 게임에 있으면 반드시 양 팀으로 갈린다
            if (members.length === 2) expect(g.team2.some((x) => x.isMember)).toBe(true)
        }
        expect(result.games.filter((g) => g.team2.some((x) => x.isMember))).toHaveLength(3)
        const counts = Object.values(result.playCounts)
        expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1)
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

    it('회원이 1명뿐이면 그 회원이 매 게임 선다 — 자유 기록으로 저장된다(0076)', () => {
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
        expect(result.games).toHaveLength(2)
        for (const g of result.games) {
            // 회원은 team1의 첫 자리 = 저장될 자유 기록의 소유자
            expect(g.team1[0].key).toBe('m1')
            expect(g.team2.some((x) => x.isMember)).toBe(false)
        }
        expect(result.playCounts.m1).toBe(2)
        // 4명이 2게임이면 전원 2회라 편차 초과는 없다 — 대신 자유 기록으로 저장된다는 안내가 붙는다
        expect(result.warnings.some((w) => w.includes('개인 기록으로만'))).toBe(true)
        expect(result.warnings.some((w) => w.includes('더 자주'))).toBe(false)
    })

    it('회원이 한 명도 없으면 만들지 않는다 — 저장할 자리가 없다', () => {
        const guests = ['g1', 'g2', 'g3', 'g4'].map((k) => p(k, 'male', 3.0, false))
        const result = buildRoomLineup(guests, { matchType: 'men_doubles', games: 2, preset: 'balanced', seed: 1 })
        expect(result.games).toEqual([])
        expect(result.warnings[0]).toContain('회원이 한 명도 없으면')
    })

    it('회원이 넉넉하면 회원끼리 양 팀으로 갈린다 — 상호 확인 게임이 자유 기록보다 낫다', () => {
        const twoMembers = [
            p('m1', 'male', 3.5), p('m2', 'male', 3.5),
            p('g1', 'male', 3.0, false), p('g2', 'male', 3.0, false),
        ]
        const result = buildRoomLineup(twoMembers, { matchType: 'men_doubles', games: 3, preset: 'balanced', seed: 1 })
        expect(result.games).toHaveLength(3)
        for (const g of result.games) {
            expect(g.team1.some((x) => x.isMember)).toBe(true)
            expect(g.team2.some((x) => x.isMember)).toBe(true)
        }
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
    it('단식은 게임마다 1대1이다', () => {
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

describe('buildRoomLineup — 단식 · 호스트 + 게스트 (0076)', () => {
    // 남자25 방 재현 — 회원 1명(호스트) + 게스트 4명, 1인당 1경기 → 3게임
    const hostAndGuests = [
        p('host', 'male', 3.5),
        ...['g1', 'g2', 'g3', 'g4'].map((k) => p(k, 'male', 3.0, false)),
    ]

    it('호스트 vs 게스트 게임이 나온다 — 호스트가 team1 첫 자리, 게스트는 편차 1 이내', () => {
        const games = gamesForPerPlayer(hostAndGuests.length, 1, false)
        expect(games).toBe(3)
        const result = buildRoomLineup(hostAndGuests, { matchType: 'singles', games, preset: 'balanced', seed: 1 })
        expect(result.games).toHaveLength(3)
        for (const g of result.games) {
            expect(g.team1[0].key).toBe('host')
            expect(g.team2[0].isMember).toBe(false)
        }
        const guestCounts = ['g1', 'g2', 'g3', 'g4'].map((k) => result.playCounts[k])
        expect(Math.max(...guestCounts) - Math.min(...guestCounts)).toBeLessThanOrEqual(1)
        expect(result.playCounts.host).toBe(3)
        expect(result.warnings.some((w) => w.includes('더 자주'))).toBe(true)
        expect(result.warnings.some((w) => w.includes('게임 3개는'))).toBe(true)
    })

    it('2면 방에서는 호스트가 한 라운드에 한 코트만 서므로 라운드당 1게임에서 멈춘다', () => {
        const result = buildRoomLineup(hostAndGuests, { matchType: 'singles', games: 3, preset: 'balanced', seed: 1, courtCount: 2 })
        // 라운드 1: host vs g? 뒤 두 번째 코트에는 회원이 없다 → 중단 경고와 함께 1게임
        expect(result.games).toHaveLength(1)
        expect(result.warnings.some((w) => w.includes('중단'))).toBe(true)
    })
})

describe('코트 면 수 — 한 라운드 안에서 같은 사람이 두 코트에 서지 않는다', () => {
    const many = (n: number) =>
        Array.from({ length: n }, (_, i) => p(`p${i}`, i % 2 === 0 ? 'male' : 'female', 2.5 + (i % 5) * 0.5))

    it('라운드 안 중복이 없다 — 없으면 실행할 수 없는 대진이 된다', () => {
        for (const courtCount of [2, 3]) {
            for (const n of [8, 9, 11, 12, 14]) {
                for (const seed of [1, 7, 99]) {
                    const players = many(n)
                    const { games } = buildRoomLineup(players, {
                        matchType: 'mixed_doubles', games: 12, preset: 'balanced', seed, courtCount,
                    })
                    const courts = effectiveCourtCount(n, 'mixed_doubles', courtCount)
                    for (const round of groupByRound(games, courts)) {
                        const keys = round.flatMap(keysOf)
                        expect(new Set(keys).size, `${n}명 ${courtCount}면 seed ${seed}`).toBe(keys.length)
                    }
                }
            }
        }
    })

    it('면 수를 주지 않으면 예전 그대로다 — 1면은 필터가 비어 있어 경로가 같다', () => {
        const before = buildRoomLineup(SIX, { matchType: 'men_doubles', games: 6, preset: 'balanced', seed: 3 })
        const after = buildRoomLineup(SIX, { matchType: 'men_doubles', games: 6, preset: 'balanced', seed: 3, courtCount: 1 })
        expect(after.games.map(keysOf)).toEqual(before.games.map(keysOf))
    })

    it('인원이 모자라면 면을 다 못 쓴다고 말해 준다', () => {
        const { warnings } = buildRoomLineup(many(11), {
            matchType: 'mixed_doubles', games: 8, preset: 'balanced', seed: 1, courtCount: 3,
        })
        expect(warnings.some((w) => w.includes('2면'))).toBe(true)
    })

    it('다면에서도 출전 편차가 1을 넘지 않는다', () => {
        for (const n of [8, 12]) {
            const { playCounts } = buildRoomLineup(many(n), {
                matchType: 'mixed_doubles', games: n, preset: 'balanced', seed: 5, courtCount: 2,
            })
            const counts = Object.values(playCounts)
            expect(Math.max(...counts) - Math.min(...counts), `${n}명`).toBeLessThanOrEqual(1)
        }
    })
})

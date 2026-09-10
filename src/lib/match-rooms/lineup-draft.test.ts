import { describe, it, expect } from 'vitest'
import type { MatchRoomGame } from '@/types'
import type { LineupPlayer } from '@/lib/match-games/lineup-core'
import { summarizeLineup } from '@/lib/match-rooms/lineup'
import {
    addGame,
    fromRoomGames,
    isMissingPlayer,
    removeGame,
    setSlot,
    toLineupGame,
    toSavePayload,
    validateDraft,
    type DraftGame,
} from '@/lib/match-rooms/lineup-draft'

function member(key: string, name: string, ntrp = 3.0): LineupPlayer {
    return { key, name, ntrp, isMember: true }
}
function guest(key: string, name: string, ntrp = 3.0): LineupPlayer {
    return { key, name, ntrp, isMember: false }
}

const A = member('u-a', '가')
const B = member('u-b', '나')
const C = member('u-c', '다')
const D = member('u-d', '라')
const E = member('u-e', '마')
const PLAYERS = [A, B, C, D, E]

function doublesDraft(): DraftGame[] {
    return [{ key: 'g1', matchType: 'men_doubles', team1: [A, B], team2: [C, D] }]
}

describe('setSlot — 자리 교체', () => {
    it('빈 자리에 새 사람을 넣는다', () => {
        const draft: DraftGame[] = [{ key: 'g1', matchType: 'men_doubles', team1: [A, null], team2: [C, D] }]
        const next = setSlot(draft, 'g1', 'team1', 1, B)
        expect(next[0].team1).toEqual([A, B])
    })

    it('같은 게임에 이미 있는 사람을 고르면 두 자리를 맞바꾼다', () => {
        const next = setSlot(doublesDraft(), 'g1', 'team1', 0, C)
        expect(next[0].team1).toEqual([C, B])
        expect(next[0].team2).toEqual([A, D])
    })

    it('같은 팀 안에서도 맞바꾼다', () => {
        const next = setSlot(doublesDraft(), 'g1', 'team1', 0, B)
        expect(next[0].team1).toEqual([B, A])
    })

    it('교체로 중복이 생기지 않는다', () => {
        const next = setSlot(doublesDraft(), 'g1', 'team2', 1, A)
        const keys = [...next[0].team1, ...next[0].team2].map((p) => p?.key)
        expect(new Set(keys).size).toBe(keys.length)
    })

    it('명단에 없던 사람을 넣으면 그냥 들어간다(스왑 대상 없음)', () => {
        const next = setSlot(doublesDraft(), 'g1', 'team1', 0, E)
        expect(next[0].team1).toEqual([E, B])
        expect(next[0].team2).toEqual([C, D])
    })

    it('다른 게임은 건드리지 않는다', () => {
        const draft: DraftGame[] = [...doublesDraft(), { key: 'g2', matchType: 'men_doubles', team1: [C, D], team2: [A, B] }]
        const next = setSlot(draft, 'g1', 'team1', 0, E)
        expect(next[1]).toBe(draft[1])
    })

    it('자리를 비울 수 있다', () => {
        const next = setSlot(doublesDraft(), 'g1', 'team2', 0, null)
        expect(next[0].team2).toEqual([null, D])
    })
})

describe('addGame · removeGame', () => {
    it('빈 자리만 있는 복식 게임을 붙인다', () => {
        const next = addGame(doublesDraft(), 'men_doubles')
        expect(next).toHaveLength(2)
        expect(next[1].team1).toEqual([null, null])
        expect(next[1].team2).toEqual([null, null])
    })

    it('단식은 자리가 한 개씩이다', () => {
        const next = addGame([], 'singles')
        expect(next[0].team1).toHaveLength(1)
        expect(next[0].team2).toHaveLength(1)
    })

    it('임시 키가 겹치지 않는다 — 지우고 다시 더해도 마찬가지', () => {
        let draft = addGame(addGame([], 'singles'), 'singles')
        draft = removeGame(draft, draft[0].key)
        draft = addGame(draft, 'singles')
        expect(new Set(draft.map((g) => g.key)).size).toBe(draft.length)
    })

    it('지정한 게임만 지운다', () => {
        const draft: DraftGame[] = [...doublesDraft(), { key: 'g2', matchType: 'men_doubles', team1: [C, D], team2: [A, B] }]
        expect(removeGame(draft, 'g1').map((g) => g.key)).toEqual(['g2'])
    })
})

describe('summarizeLineup — 편집 뒤에도 집계가 맞는다', () => {
    it('게임을 지우면 출전 횟수가 줄고 쉼이 늘어난다', () => {
        const draft: DraftGame[] = [
            { key: 'g1', matchType: 'men_doubles', team1: [A, B], team2: [C, D] },
            { key: 'g2', matchType: 'men_doubles', team1: [A, C], team2: [B, E] },
        ]
        expect(summarizeLineup(draft, PLAYERS).playCounts).toEqual({ 'u-a': 2, 'u-b': 2, 'u-c': 2, 'u-d': 1, 'u-e': 1 })

        const after = summarizeLineup(removeGame(draft, 'g2'), PLAYERS)
        expect(after.playCounts).toEqual({ 'u-a': 1, 'u-b': 1, 'u-c': 1, 'u-d': 1, 'u-e': 0 })
        expect(after.resting).toEqual([['u-e']])
    })

    it('자리를 교체하면 쉬는 사람이 따라 바뀐다', () => {
        const next = setSlot(doublesDraft(), 'g1', 'team1', 0, E)
        expect(summarizeLineup(next, PLAYERS).resting).toEqual([['u-a']])
    })

    it('빈 자리는 아무도 뛰지 않은 것으로 센다', () => {
        const draft = addGame([], 'men_doubles')
        expect(summarizeLineup(draft, PLAYERS).playCounts).toEqual({ 'u-a': 0, 'u-b': 0, 'u-c': 0, 'u-d': 0, 'u-e': 0 })
    })
})

describe('validateDraft — DB 가드의 거울', () => {
    it('온전한 대진은 통과한다', () => {
        expect(validateDraft(doublesDraft())).toEqual([])
    })

    it('게임이 없으면 막는다', () => {
        expect(validateDraft([])).toEqual(['경기를 한 건 이상 만들어주세요.'])
    })

    it('빈 자리를 잡아낸다', () => {
        const draft: DraftGame[] = [{ key: 'g1', matchType: 'men_doubles', team1: [A, null], team2: [C, D] }]
        expect(validateDraft(draft)).toEqual(['게임 1: 아직 비어 있는 자리가 있습니다.'])
    })

    it('같은 사람이 두 번 들어가면 막는다 — duplicate_players의 거울', () => {
        const draft: DraftGame[] = [{ key: 'g1', matchType: 'men_doubles', team1: [A, B], team2: [A, D] }]
        expect(validateDraft(draft)).toEqual(['게임 1: 같은 사람이 두 번 들어갔습니다.'])
    })

    it('한 팀이 전원 비회원이면 막는다 — invalid_games의 거울', () => {
        const draft: DraftGame[] = [{
            key: 'g1', matchType: 'men_doubles',
            team1: [A, B], team2: [guest('g-1', '손님1'), guest('g-2', '손님2')],
        }]
        expect(validateDraft(draft)).toEqual(['게임 1: 각 팀에 회원이 최소 1명씩 필요합니다.'])
    })

    it('팀마다 회원이 하나씩만 있어도 통과한다', () => {
        const draft: DraftGame[] = [{
            key: 'g1', matchType: 'men_doubles',
            team1: [A, guest('g-1', '손님1')], team2: [B, guest('g-2', '손님2')],
        }]
        expect(validateDraft(draft)).toEqual([])
    })

    it('게임 번호는 배열 순서를 따른다', () => {
        const draft: DraftGame[] = [
            ...doublesDraft(),
            { key: 'g2', matchType: 'men_doubles', team1: [A, null], team2: [C, D] },
        ]
        expect(validateDraft(draft)).toEqual(['게임 2: 아직 비어 있는 자리가 있습니다.'])
    })
})

describe('fromRoomGames — 저장된 게임을 되살린다', () => {
    function roomGame(): MatchRoomGame {
        return {
            id: 'pm-1',
            matchType: 'men_doubles',
            setScores: [],
            ownerUserId: 'u-a',
            ownerName: '가',
            sourceType: 'confirmation',
            participants: [
                { role: 'partner', name: '나', userId: 'u-b' },
                { role: 'opponent', name: '다', userId: 'u-c' },
                { role: 'opponent2', name: '손님' },
            ],
        }
    }

    it('작성자가 team1의 첫 자리다', () => {
        const [g] = fromRoomGames([roomGame()], [...PLAYERS, guest('g-1', '손님')])
        expect(g.key).toBe('pm-1')
        expect(g.team1.map((p) => p?.key)).toEqual(['u-a', 'u-b'])
        expect(g.team2.map((p) => p?.key)).toEqual(['u-c', 'g-1'])
    })

    it('게스트는 이름으로 명단과 맞춘다', () => {
        const [g] = fromRoomGames([roomGame()], [...PLAYERS, guest('g-1', ' 손님 ')])
        expect(g.team2[1]?.key).toBe('g-1')
    })

    it('명단에 없는 사람은 자리표시로 남는다 — 자리를 비우지 않는다', () => {
        const [g] = fromRoomGames([roomGame()], PLAYERS)
        const slot = g.team2[1]
        expect(slot?.name).toBe('손님')
        expect(isMissingPlayer(slot)).toBe(true)
        expect(validateDraft([g])).toEqual(['게임 1: 손님 님은 방 명단에 없습니다.'])
    })

    it('단식은 자리가 한 개씩이다', () => {
        const singles: MatchRoomGame = {
            ...roomGame(), matchType: 'singles',
            participants: [{ role: 'opponent', name: '다', userId: 'u-c' }],
        }
        const [g] = fromRoomGames([singles], PLAYERS)
        expect(g.team1).toEqual([A])
        expect(g.team2).toEqual([C])
    })
})

describe('toLineupGame · toSavePayload', () => {
    it('자리가 다 차면 읽기 카드용 게임이 된다', () => {
        expect(toLineupGame(doublesDraft()[0], 2)).toEqual({
            seq: 3, matchType: 'men_doubles', team1: [A, B], team2: [C, D],
        })
    })

    it('빈 자리가 있으면 읽기 카드로 못 그린다', () => {
        const draft: DraftGame[] = [{ key: 'g1', matchType: 'men_doubles', team1: [A, null], team2: [C, D] }]
        expect(toLineupGame(draft[0], 0)).toBeNull()
    })

    it('회원은 userId로, 비회원은 이름만으로 저장한다', () => {
        const draft: DraftGame[] = [{
            key: 'g1', matchType: 'men_doubles',
            team1: [A, guest('g-1', '손님')], team2: [B, C],
        }]
        expect(toSavePayload(draft)).toEqual([{
            team1: [{ userId: 'u-a', name: '가' }, { userId: undefined, name: '손님' }],
            team2: [{ userId: 'u-b', name: '나' }, { userId: 'u-c', name: '다' }],
        }])
    })
})

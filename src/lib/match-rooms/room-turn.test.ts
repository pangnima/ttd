import { describe, it, expect } from 'vitest'
import type { MatchRoomGame, PersonalMatchConfirmation } from '@/types'
import { classifyRoomGameTurn, closeRotationRooms, isMyRoomTurn, rollUpRoomTurns, turnOfBucket, viewerRoomTurn } from './room-turn'

const ME = 'me'
const OTHER = 'other'

function game(over: Partial<MatchRoomGame> = {}): MatchRoomGame {
    return {
        id: 'g1',
        matchType: 'singles',
        setScores: [],
        participants: [{ role: 'opponent', name: '상대', userId: OTHER }],
        ownerUserId: ME,
        ownerName: '나',
        sourceType: 'confirmation',
        sourceRequestId: 'r1',
        ...over,
    }
}

function conf(over: Partial<PersonalMatchConfirmation> = {}): PersonalMatchConfirmation {
    return {
        status: 'none',
        viewerIsParty: true,
        proposedByMe: false,
        confirmedByMe: false,
        disputedByMe: false,
        ...over,
    } as PersonalMatchConfirmation
}

describe('classifyRoomGameTurn — 상호 확인 게임', () => {
    it('스코어가 있으면 끝난 게임이다 (정정은 할 일이 아니다)', () => {
        expect(classifyRoomGameTurn(game({ setScores: [{ me: 6, opp: 3 }] }), ME, conf({ status: 'confirmed' })))
            .toBe('none')
    })

    it('당사자가 아니면 아무 차례도 아니다', () => {
        expect(classifyRoomGameTurn(game(), 'stranger', conf())).toBe('none')
    })

    it('아직 아무도 제안하지 않았으면 내가 입력할 차례다', () => {
        expect(classifyRoomGameTurn(game(), ME, conf({ status: 'none' }))).toBe('enterResult')
    })

    it('제안됐고 내가 아직 확인하지 않았으면 확인할 차례다', () => {
        expect(classifyRoomGameTurn(game(), ME, conf({ status: 'proposed' }))).toBe('confirmResult')
    })

    it('내가 제안했거나 이미 확인했으면 남은 좌석을 기다린다', () => {
        expect(classifyRoomGameTurn(game(), ME, conf({ status: 'proposed', proposedByMe: true }))).toBe('waiting')
        expect(classifyRoomGameTurn(game(), ME, conf({ status: 'proposed', confirmedByMe: true }))).toBe('waiting')
    })

    it('이의 상태의 차례는 제안자뿐이다', () => {
        expect(classifyRoomGameTurn(game(), ME, conf({ status: 'disputed', proposedByMe: true })))
            .toBe('reenterResult')
        expect(classifyRoomGameTurn(game(), ME, conf({ status: 'disputed', proposedByMe: false })))
            .toBe('waiting')
    })

    it('이의를 거친 재제안은 좌석 폴백보다 먼저 이의 차례로 간다', () => {
        // viewerIsParty가 false여도 이의 이력이 있으면 대기로 떨어지되, 좌석이면 재확인 차례다
        expect(classifyRoomGameTurn(game(), ME, conf({ status: 'proposed', disputeRound: 1 })))
            .toBe('reentryReview')
        expect(classifyRoomGameTurn(game(), ME, conf({ status: 'proposed', disputeRound: 1, proposedByMe: true })))
            .toBe('waiting')
    })

    it('협상 행을 못 읽으면 대기다', () => {
        expect(classifyRoomGameTurn(game(), ME, undefined)).toBe('waiting')
        expect(classifyRoomGameTurn(game(), ME, conf({ viewerIsParty: false }))).toBe('waiting')
    })
})

describe('classifyRoomGameTurn — 자유 기록', () => {
    const free = (over: Partial<MatchRoomGame> = {}) =>
        game({ sourceType: 'direct', sourceRequestId: undefined, ...over })

    it('라인업이 다 찼으면 작성자가 입력할 차례다', () => {
        expect(classifyRoomGameTurn(free(), ME)).toBe('enterResult')
    })

    it('라인업이 덜 찼으면 참가자를 채워야 한다', () => {
        expect(classifyRoomGameTurn(free({ participants: [] }), ME)).toBe('fillLineup')
    })

    it('작성자가 아니면 손댈 수 없다 — 협상 상대가 없는 기록이다', () => {
        expect(classifyRoomGameTurn(free({ ownerUserId: OTHER, participants: [{ role: 'opponent', name: '나', userId: ME }] }), ME))
            .toBe('none')
    })
})

describe('viewerRoomTurn — 룸 전체에서 가장 급한 하나', () => {
    it('할 일도 기다릴 것도 없으면 null이다', () => {
        expect(viewerRoomTurn([], ME, {})).toBeNull()
        expect(viewerRoomTurn([game({ setScores: [{ me: 6, opp: 0 }] })], ME, {})).toBeNull()
    })

    it('내 차례가 여럿이면 우선순위가 높은 것을 건수와 함께 돌려준다', () => {
        const games = [
            game({ id: 'a', sourceRequestId: 'ra' }),
            game({ id: 'b', sourceRequestId: 'rb' }),
            game({ id: 'c', sourceRequestId: 'rc' }),
        ]
        const confirmations = {
            ra: conf({ status: 'none' }),                        // enterResult
            rb: conf({ status: 'proposed' }),                    // confirmResult
            rc: conf({ status: 'disputed', proposedByMe: true }), // reenterResult (최우선)
        }
        expect(viewerRoomTurn(games, ME, confirmations)).toEqual({ turn: 'reenterResult', count: 1 })
    })

    it('같은 차례가 여럿이면 건수를 센다', () => {
        const games = [game({ id: 'a', sourceRequestId: 'ra' }), game({ id: 'b', sourceRequestId: 'rb' })]
        const confirmations = { ra: conf({ status: 'proposed' }), rb: conf({ status: 'proposed' }) }
        expect(viewerRoomTurn(games, ME, confirmations)).toEqual({ turn: 'confirmResult', count: 2 })
    })

    it('내 차례가 없으면 대기를 돌려준다 — 빈 배너가 아니라 "기다리는 중"이 맞다', () => {
        const games = [game({ id: 'a', sourceRequestId: 'ra' })]
        expect(viewerRoomTurn(games, ME, { ra: conf({ status: 'proposed', proposedByMe: true }) }))
            .toEqual({ turn: 'waiting', count: 1 })
    })
})

describe('turnOfBucket / rollUpRoomTurns — 매칭 리스트 롤업', () => {
    it('대기 3종은 하나로 접힌다 — 목록에서 구분할 이유가 없다', () => {
        expect(turnOfBucket('awaitingCounterpart')).toBe('waiting')
        expect(turnOfBucket('awaitingReentry')).toBe('waiting')
        expect(turnOfBucket('awaitingReentryConfirm')).toBe('waiting')
    })

    it('내 차례 버킷은 어휘만 바뀌고 그대로 남는다', () => {
        expect(turnOfBucket('confirmResult')).toBe('confirmResult')
        expect(turnOfBucket('enterResult')).toBe('enterResult')
        expect(turnOfBucket('fillLineup')).toBe('fillLineup')
        expect(turnOfBucket('reenterResult')).toBe('reenterResult')
        expect(turnOfBucket('reentryReview')).toBe('reentryReview')
    })

    it('roomId가 없는 행(방 밖 기록)은 버린다', () => {
        expect(rollUpRoomTurns([{ turn: 'confirmResult' }, { roomId: undefined, turn: 'enterResult' }]).size).toBe(0)
    })

    it('방마다 가장 급한 차례 하나로 접고 건수를 센다', () => {
        const map = rollUpRoomTurns([
            { roomId: 'A', turn: 'enterResult' },
            { roomId: 'A', turn: 'confirmResult' },
            { roomId: 'A', turn: 'confirmResult' },
            { roomId: 'B', turn: 'waiting' },
        ])
        expect(map.get('A')).toEqual({ turn: 'confirmResult', count: 2 })
        expect(map.get('B')).toEqual({ turn: 'waiting', count: 1 })
    })
})

describe('isMyRoomTurn', () => {
    it('대기와 무관은 내 차례가 아니다', () => {
        expect(isMyRoomTurn('waiting')).toBe(false)
        expect(isMyRoomTurn('none')).toBe(false)
    })

    it('나머지는 전부 내 차례다', () => {
        for (const turn of ['enterResult', 'confirmResult', 'reenterResult', 'reentryReview', 'fillLineup'] as const) {
            expect(isMyRoomTurn(turn)).toBe(true)
        }
    })
})

describe('viewerRoomTurn — 호스트의 게임 입력 종료 차례 (0077)', () => {
    const done = game({ setScores: [{ me: 6, opp: 3 }] })
    const open = game({ id: 'g2', sourceRequestId: 'r2' })

    it('미확정 로테이션 호스트고 게임이 전부 확정됐으면 closeRotation', () => {
        expect(viewerRoomTurn([done], ME, {}, { hostOfPendingRotation: true }))
            .toEqual({ turn: 'closeRotation', count: 1 })
    })

    it('미확정 게임이 남아 있으면 그쪽 차례가 우선한다', () => {
        const r = viewerRoomTurn([done, open], ME, { r2: conf() }, { hostOfPendingRotation: true })
        expect(r?.turn).toBe('enterResult')
    })

    it('게임이 없으면 종료 차례도 없다 — 모집 중인 방을 닫으라고 하지 않는다', () => {
        expect(viewerRoomTurn([], ME, {}, { hostOfPendingRotation: true })).toBeNull()
    })

    it('참가자에게는 종료 차례가 없다', () => {
        expect(viewerRoomTurn([done], ME, {})).toBeNull()
    })

    it('closeRotation은 내 차례다 — 뱃지에 센다', () => {
        expect(isMyRoomTurn('closeRotation')).toBe(true)
    })
})

describe('closeRotationRooms — 목록에서 호스트 종료 차례 (0077)', () => {
    const sessions = [
        { roomId: 'r-mine-done', userId: ME },
        { roomId: 'r-mine-open', userId: ME },
        { roomId: 'r-mine-empty', userId: ME },
        { roomId: 'r-theirs', userId: OTHER },
        { userId: ME },
    ]
    const tallies = {
        'r-mine-done': { total: 2, settled: 2 },
        'r-mine-open': { total: 2, settled: 1 },
        'r-theirs': { total: 1, settled: 1 },
    }

    it('내가 소유한 방 세션 중 게임이 있고 전부 확정된 방만', () => {
        expect(closeRotationRooms(sessions, ME, tallies)).toEqual(['r-mine-done'])
    })

    it('rollUpRoomTurns를 거치면 그 방의 차례가 된다', () => {
        const turns = rollUpRoomTurns([{ roomId: 'r-mine-done', turn: 'closeRotation' }])
        expect(turns.get('r-mine-done')).toEqual({ turn: 'closeRotation', count: 1 })
    })
})

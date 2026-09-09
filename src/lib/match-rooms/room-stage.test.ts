import { describe, it, expect } from 'vitest'
import type { MatchRoomGame, MatchRoomSource, MatchResultStatus } from '@/types'
import { roomStage } from './room-stage'

function game(over: Partial<MatchRoomGame> = {}): MatchRoomGame {
    return {
        id: 'g1',
        matchType: 'singles',
        setScores: [],
        participants: [],
        ownerUserId: 'me',
        ownerName: '나',
        sourceType: 'confirmation',
        ...over,
    }
}

const scored = (id: string, status?: MatchResultStatus) =>
    game({ id, setScores: [{ me: 6, opp: 4 }], resultStatus: status })
const open = (id: string, status?: MatchResultStatus) => game({ id, resultStatus: status })

const direct: MatchRoomSource = { kind: 'direct' }
const pendingRotation: MatchRoomSource = { kind: 'rotation', isFinalized: false }
const finalizedRotation: MatchRoomSource = { kind: 'rotation', isFinalized: true }

describe('roomStage', () => {
    it('정산되면 게임 상태와 무관하게 종료다 — 판정의 권위는 DB에 있다', () => {
        expect(roomStage({ room: { isSettled: true }, games: [], source: direct })).toBe('closed')
        expect(roomStage({ room: { isSettled: true }, games: [open('a')], source: direct })).toBe('closed')
        expect(roomStage({ room: { isSettled: true }, games: [], source: pendingRotation })).toBe('closed')
    })

    it('게임이 없으면 모집 중이다', () => {
        expect(roomStage({ room: { isSettled: false }, games: [], source: direct })).toBe('recruiting')
        expect(roomStage({ room: { isSettled: false }, games: [], source: pendingRotation })).toBe('recruiting')
    })

    it('미확정 로테이션 방은 결과 확인 중이 되지 않는다 — 세션이 열려 있으면 게임이 더 들어온다', () => {
        expect(roomStage({
            room: { isSettled: false },
            games: [scored('a'), scored('b')],
            source: pendingRotation,
        })).toBe('playing')
        expect(roomStage({
            room: { isSettled: false },
            games: [open('a', 'proposed')],
            source: pendingRotation,
        })).toBe('playing')
    })

    it('스코어가 빈 게임이 남아 있으면 진행 중이다', () => {
        expect(roomStage({
            room: { isSettled: false },
            games: [scored('a'), open('b', 'none')],
            source: direct,
        })).toBe('playing')
    })

    it('스코어가 빈 게임이 전부 제안·이의 중이면 결과 확인 중이다', () => {
        expect(roomStage({
            room: { isSettled: false },
            games: [scored('a'), open('b', 'proposed')],
            source: direct,
        })).toBe('reviewing')
        expect(roomStage({
            room: { isSettled: false },
            games: [open('a', 'disputed'), open('b', 'proposed')],
            source: direct,
        })).toBe('reviewing')
    })

    it('입력할 게임과 확인할 게임이 섞여 있으면 진행 중이 이긴다', () => {
        expect(roomStage({
            room: { isSettled: false },
            games: [open('a', 'proposed'), open('b', 'none')],
            source: direct,
        })).toBe('playing')
    })

    it('스코어는 다 있는데 아직 정산되지 않았다면 확인이 남은 것이다', () => {
        // 대기 중인 요청·미확정 세션 때문에 is_settled가 아직 false인 상태
        expect(roomStage({
            room: { isSettled: false },
            games: [scored('a'), scored('b')],
            source: finalizedRotation,
        })).toBe('reviewing')
    })
})

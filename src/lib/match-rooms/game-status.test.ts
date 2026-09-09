import { describe, expect, it } from 'vitest'
import type { MatchRoomDetail, MatchRoomGame, MatchRoomSource } from '@/types'
import { canEditRoomGame, isRoomGameParty, roomGameStatusBadge, roomGamesEmptyMessage } from './game-status'

const base: MatchRoomGame = {
    id: 'g1',
    matchType: 'singles',
    setScores: [],
    participants: [{ role: 'opponent', name: '상대', userId: 'u2' }],
    ownerUserId: 'u1',
    ownerName: '작성자',
    sourceType: 'direct',
}

describe('roomGameStatusBadge', () => {
    it('결과가 있으면 배지 없음 — 그 자리는 결과 배지(WIN/LOSS)가 쓴다', () => {
        expect(roomGameStatusBadge({ ...base, setScores: [{ me: 6, opp: 3 }] })).toBeNull()
    })

    it('자유 기록은 라인업 완성 여부로 갈린다', () => {
        expect(roomGameStatusBadge(base)).toEqual({ label: '결과 미입력', tone: 'attention' })
        expect(roomGameStatusBadge({ ...base, participants: [] })).toEqual({ label: '모집 중', tone: 'pending' })
    })

    it('상호 확인 게임은 협상 상태를 말한다', () => {
        const mutual: MatchRoomGame = { ...base, sourceType: 'confirmation', sourceRequestId: 'r1' }
        expect(roomGameStatusBadge({ ...mutual, resultStatus: 'none' })?.label).toBe('결과 미입력')
        expect(roomGameStatusBadge({ ...mutual, resultStatus: 'proposed' })?.label).toBe('결과 확인 대기')
        expect(roomGameStatusBadge({ ...mutual, resultStatus: 'disputed' })?.label).toBe('이의 제기')
    })

    it('모집 중만 pending — 나머지는 누군가 손댈 차례라 주의 톤이다', () => {
        const mutual: MatchRoomGame = { ...base, sourceType: 'confirmation', sourceRequestId: 'r1' }
        expect(roomGameStatusBadge({ ...mutual, resultStatus: 'proposed' })?.tone).toBe('attention')
        expect(roomGameStatusBadge({ ...mutual, resultStatus: 'disputed' })?.tone).toBe('attention')
    })
})

describe('canEditRoomGame · isRoomGameParty', () => {
    it('자유 기록은 작성자만 수정, 상호 확인은 아무도 못 한다', () => {
        expect(canEditRoomGame(base, 'u1')).toBe(true)
        expect(canEditRoomGame(base, 'u2')).toBe(false)
        expect(canEditRoomGame({ ...base, sourceType: 'confirmation' }, 'u1')).toBe(false)
    })

    it('당사자는 작성자와 라인업의 회원', () => {
        expect(isRoomGameParty(base, 'u1')).toBe(true)
        expect(isRoomGameParty(base, 'u2')).toBe(true)
        expect(isRoomGameParty(base, 'u3')).toBe(false)
    })
})

describe('roomGamesEmptyMessage', () => {
    const detailWith = (source: MatchRoomSource): MatchRoomDetail => ({
        room: {
            id: 'r1', hostUserId: 'u1', sourceKind: source.kind, playedAt: '2026-09-12',
            matchType: 'singles', isSettled: false, createdAt: '2026-09-01T00:00:00Z',
        },
        host: { id: 'u1', name: '방장', nickname: '', deleted: false },
        members: [],
        source,
        games: [],
    })

    it('미확정 로테이션은 게임 빌더로 안내', () => {
        expect(roomGamesEmptyMessage(detailWith({ kind: 'rotation', isFinalized: false })))
            .toContain('게임 입력')
    })

    it('확정된 로테이션은 게임 추가 안내', () => {
        expect(roomGamesEmptyMessage(detailWith({ kind: 'rotation', isFinalized: true })))
            .toContain('게임을 추가하세요')
    })

    it('수락 전 확인 요청은 대표 수락을 기다린다', () => {
        expect(roomGamesEmptyMessage(detailWith({ kind: 'confirmation', requestStatus: 'pending', participants: [] })))
            .toContain('상대 대표가 확인 요청을 수락하면')
    })

    it('자유 기록은 게임 추가 안내', () => {
        expect(roomGamesEmptyMessage(detailWith({ kind: 'direct' }))).toContain('게임을 추가하세요')
    })
})

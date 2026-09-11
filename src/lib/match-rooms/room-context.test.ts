import { describe, expect, it } from 'vitest'
import type { MatchRoomDetail, MatchRoomSource } from '@/types'
import { canAddRoomGame, canViewerAddRoomGame } from './room-context'

function detail(source: MatchRoomSource, isSettled = false, viewerStatus?: 'joined' | 'invited'): MatchRoomDetail {
    return {
        room: {
            id: 'r1', hostUserId: 'host', sourceKind: source.kind, playedAt: '2026-09-12',
            matchType: 'singles', courtCount: 1, isSettled, createdAt: '2026-09-01T00:00:00Z',
        },
        host: { id: 'host', name: '방장', nickname: '', deleted: false },
        members: [],
        guests: [],
        source,
        games: [],
        viewer: viewerStatus ? { status: viewerStatus, role: 'player' } : undefined,
    } as MatchRoomDetail
}

describe('canAddRoomGame — 출처별 게임 추가 가능 여부', () => {
    it('자유 기록 방은 언제나, 로테이션은 finalize 뒤, 확인 요청은 수락 뒤', () => {
        expect(canAddRoomGame(detail({ kind: 'direct' }))).toBe(true)
        expect(canAddRoomGame(detail({ kind: 'rotation', isFinalized: false }))).toBe(false)
        expect(canAddRoomGame(detail({ kind: 'rotation', isFinalized: true }))).toBe(true)
        expect(canAddRoomGame(detail({ kind: 'confirmation', requestStatus: 'pending', participants: [] }))).toBe(false)
        expect(canAddRoomGame(detail({ kind: 'confirmation', requestStatus: 'accepted', participants: [] }))).toBe(true)
    })

    it('정산된 방에는 출처와 무관하게 붙이지 않는다 — RPC room_already_closed·RLS의 거울(0077)', () => {
        expect(canAddRoomGame(detail({ kind: 'direct' }, true))).toBe(false)
        expect(canAddRoomGame(detail({ kind: 'rotation', isFinalized: true }, true))).toBe(false)
    })
})

describe('canViewerAddRoomGame — 참가자 자격까지', () => {
    it('방장과 joined 참가자만', () => {
        expect(canViewerAddRoomGame(detail({ kind: 'direct' }), 'host')).toBe(true)
        expect(canViewerAddRoomGame(detail({ kind: 'direct' }, false, 'joined'), 'p')).toBe(true)
        expect(canViewerAddRoomGame(detail({ kind: 'direct' }, false, 'invited'), 'p')).toBe(false)
        expect(canViewerAddRoomGame(detail({ kind: 'direct' }), 'stranger')).toBe(false)
    })

    it('정산되면 방장도 못 붙인다', () => {
        expect(canViewerAddRoomGame(detail({ kind: 'direct' }, true), 'host')).toBe(false)
    })
})

import { describe, expect, it } from 'vitest'
import type { MatchRoomDetail, MatchRoomGame, MatchRoomSource } from '@/types'
import { canCreateRoomLineup, canEditRoomGame, isRoomGameParty, roomGameStatusBadge, roomGamesEmptyMessage, roomGameMemberIds, statusBadgeReplacedByActions } from './game-status'

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

describe('statusBadgeReplacedByActions — 이의 상태의 당사자 행은 배지 하나(F-20)', () => {
    const disputed: MatchRoomGame = { ...base, sourceType: 'confirmation', resultStatus: 'disputed' }

    it('당사자 + 협상이 있으면 상태 배지를 액션 배지에 양보한다', () => {
        expect(statusBadgeReplacedByActions(disputed, 'u1', true)).toBe(true)
        expect(statusBadgeReplacedByActions(disputed, 'u2', true)).toBe(true)
    })

    it('제3자·협상 없음·다른 상태에서는 상태 배지가 남는다', () => {
        expect(statusBadgeReplacedByActions(disputed, 'u3', true)).toBe(false)
        expect(statusBadgeReplacedByActions(disputed, 'u1', false)).toBe(false)
        expect(statusBadgeReplacedByActions({ ...disputed, resultStatus: 'proposed' }, 'u1', true)).toBe(false)
    })
})

describe('roomGamesEmptyMessage', () => {
    const detailWith = (source: MatchRoomSource): MatchRoomDetail => ({
        room: {
            id: 'r1', hostUserId: 'u1', sourceKind: source.kind, playedAt: '2026-09-12',
            matchType: 'singles', courtCount: 1, isSettled: false, isListed: true, createdAt: '2026-09-01T00:00:00Z',
        },
        host: { id: 'u1', name: '호스트', nickname: '', deleted: false },
        members: [],
        guests: [],
        source,
        games: [],
    })

    it('미확정 로테이션은 게임 빌더로 안내', () => {
        expect(roomGamesEmptyMessage(detailWith({ kind: 'rotation', isFinalized: false })))
            .toContain('게임 입력')
    })

    it('미확정 로테이션의 호스트에게는 [자동 대진표]도 말한다 — 참가자에게는 없는 버튼이라 말하지 않는다', () => {
        const pending = detailWith({ kind: 'rotation', isFinalized: false })
        expect(roomGamesEmptyMessage(pending, true)).toContain('자동 대진표')
        expect(roomGamesEmptyMessage(pending, false)).not.toContain('자동 대진표')
        expect(roomGamesEmptyMessage(detailWith({ kind: 'rotation', isFinalized: true }), true)).not.toContain('자동 대진표')
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

    it('게임을 추가할 수 있는 참가자에게는 "내가 만들 수 있다"를 말한다(U-13)', () => {
        expect(roomGamesEmptyMessage(detailWith({ kind: 'direct' }), { canAdd: true })).toContain('[게임 추가]')
        expect(roomGamesEmptyMessage(detailWith({ kind: 'direct' }), { canAdd: false })).not.toContain('[게임 추가]')
        // 옛 불리언 시그니처는 canLineup으로 읽힌다
        expect(roomGamesEmptyMessage(detailWith({ kind: 'rotation', isFinalized: false }), true)).toContain('자동 대진표')
    })
})

describe('roomGameMemberIds — 경기에 배정된 회원 (0070)', () => {
    const game = (owner: string, players: Array<{ role: string; name: string; userId?: string }>) => ({
        id: 'g', matchType: 'men_doubles' as const, setScores: [], participants: players,
        ownerUserId: owner, ownerName: '작성자', sourceType: 'confirmation' as const,
    })

    it('작성자와 라인업의 회원을 모두 모은다', () => {
        const ids = roomGameMemberIds([game('u1', [
            { role: 'partner', name: '파트너', userId: 'u2' },
            { role: 'opponent', name: '상대', userId: 'u3' },
        ])])
        expect([...ids].sort()).toEqual(['u1', 'u2', 'u3'])
    })

    it('비회원 슬롯은 세지 않는다 — 멤버 테이블에 없어 내보내기 대상이 아니다', () => {
        const ids = roomGameMemberIds([game('u1', [{ role: 'opponent', name: '게스트' }])])
        expect([...ids]).toEqual(['u1'])
    })

    it('게임이 없으면 빈 집합 — 아무나 내보낼 수 있다', () => {
        expect(roomGameMemberIds([]).size).toBe(0)
    })
})

describe('canCreateRoomLineup — create_room_lineup 가드의 거울', () => {
    const room = (over: Partial<MatchRoomDetail['room']> = {}): MatchRoomDetail => ({
        room: {
            id: 'r1', hostUserId: 'u1', sourceKind: 'rotation', playedAt: '2026-09-12',
            matchType: 'men_doubles', courtCount: 1, isSettled: false, isListed: true, createdAt: '2026-09-01T00:00:00Z', ...over,
        },
        host: { id: 'u1', name: '호스트', nickname: '', deleted: false },
        members: [],
        guests: [],
        source: { kind: 'rotation', isFinalized: false },
        games: [],
    })

    it('후보가 없으면(= 호스트가 아니면) 그리지 않는다', () => {
        expect(canCreateRoomLineup(room(), 0, 0)).toBe(false)
    })

    it('정산된 방은 RPC가 거절하므로 그리지 않는다', () => {
        expect(canCreateRoomLineup(room({ isSettled: true }), 4, 2)).toBe(false)
    })

    // 0072 회귀 가드 — 0071이 로테이션 방을 막아 복식 방 전체에서 자동 대진표가 죽었다.
    // 복식 방은 예외 없이 로테이션 방이고, 자동 대진표는 바로 그 방을 위한 기능이다.
    it('미확정 로테이션 방에서도 그린다 — 방식을 보지 않는다', () => {
        expect(canCreateRoomLineup(room(), 4, 2)).toBe(true)
    })

    it('단식 방에서도 그린다', () => {
        expect(canCreateRoomLineup(room({ sourceKind: 'direct', matchType: 'singles' }), 2, 2)).toBe(true)
    })

    it('회원이 한 명뿐이어도 그린다 — 회원 1명 게임은 자유 기록으로 저장된다(0076)', () => {
        expect(canCreateRoomLineup(room({ sourceKind: 'direct', matchType: 'singles' }), 5, 1)).toBe(true)
    })

    it('회원이 한 명도 없으면 그리지 않는다 — 저장할 자리가 없다', () => {
        expect(canCreateRoomLineup(room(), 4, 0)).toBe(false)
    })
})

import { describe, it, expect } from 'vitest'
import type { RotationSession, RotationSessionSeat } from '@/types'
import {
    canEnterRotationResult, canManageRotationPool, classifyRotationSession, pendingSeats, poolMemberIds,
    rejectedSeats, requiresSessionConsent,
} from '@/lib/personal-matches/rotation-participation'

const OWNER = 'owner-1'
const ME = 'me-1'
const NO_ROOMS: ReadonlySet<string> = new Set()

function session(over: Partial<RotationSession> = {}): RotationSession {
    return {
        id: 's1',
        userId: OWNER,
        playedAt: '2026-09-07',
        playedTime: '19:00',
        matchType: 'men_doubles',
        surface: 'hard',
        players: [],
        createdAt: '2026-09-07T00:00:00Z',
        seats: [],
        ...over,
    }
}

const seat = (userId: string, acceptance: RotationSessionSeat['acceptance']): RotationSessionSeat =>
    ({ userId, name: userId, acceptance })

describe('requiresSessionConsent', () => {
    it('방 밖 세션만 좌석 동의 모델이다', () => {
        expect(requiresSessionConsent(session())).toBe(true)
        expect(requiresSessionConsent(session({ roomId: 'r1' }))).toBe(false)
    })
})

describe('canEnterRotationResult — finalize 진입 가드의 거울', () => {
    it('소유자는 방 안팎을 가리지 않고 입력한다', () => {
        expect(canEnterRotationResult(session(), OWNER, NO_ROOMS)).toBe(true)
        expect(canEnterRotationResult(session({ roomId: 'r1' }), OWNER, NO_ROOMS)).toBe(true)
    })

    it('방 밖 세션은 참여를 수락해야 입력할 수 있다', () => {
        expect(canEnterRotationResult(session({ viewerParticipation: 'accepted' }), ME, NO_ROOMS)).toBe(true)
        expect(canEnterRotationResult(session({ viewerParticipation: 'pending' }), ME, NO_ROOMS)).toBe(false)
        expect(canEnterRotationResult(session({ viewerParticipation: 'rejected' }), ME, NO_ROOMS)).toBe(false)
        expect(canEnterRotationResult(session(), ME, NO_ROOMS)).toBe(false)
    })

    it('방 세션은 좌석이 아니라 입장(joined) 여부가 자격이다', () => {
        const s = session({ roomId: 'r1', viewerParticipation: 'pending' })
        expect(canEnterRotationResult(s, ME, new Set(['r1']))).toBe(true)
        expect(canEnterRotationResult(s, ME, new Set(['other']))).toBe(false)
    })
})

describe('classifyRotationSession — 판정 순서가 규칙', () => {
    it('입력 자격이 있으면 다른 조건보다 먼저 enter로 간다', () => {
        expect(classifyRotationSession(session(), OWNER, NO_ROOMS)).toBe('enter')
        expect(classifyRotationSession(session({ viewerParticipation: 'accepted' }), ME, NO_ROOMS)).toBe('enter')
    })

    it('미응답 좌석은 내 차례(respond)', () => {
        expect(classifyRotationSession(session({ viewerParticipation: 'pending' }), ME, NO_ROOMS)).toBe('respond')
    })

    it('거절했거나 좌석이 없으면 큐에서 뺀다', () => {
        expect(classifyRotationSession(session({ viewerParticipation: 'rejected' }), ME, NO_ROOMS)).toBe('none')
        expect(classifyRotationSession(session(), ME, NO_ROOMS)).toBe('none')
    })

    it('방 세션의 미입장 좌석 보유자는 수락해도 respond/enter가 아니다', () => {
        // 방은 '입장 = 동의'라 좌석이 accepted로 만들어진다. 입장하지 않았다면 방 상세로 들어가야 한다.
        const s = session({ roomId: 'r1', viewerParticipation: 'accepted' })
        expect(classifyRotationSession(s, ME, NO_ROOMS)).toBe('awaitOwner')
    })
})

describe('canManageRotationPool — 참가자 초대 자격 (0058)', () => {
    it('방 밖 세션의 주최자와 수락자만 초대할 수 있다', () => {
        expect(canManageRotationPool(session(), OWNER)).toBe(true)
        expect(canManageRotationPool(session({ viewerParticipation: 'accepted' }), ME)).toBe(true)
    })

    it('미응답·거절·무관자는 초대할 수 없다', () => {
        expect(canManageRotationPool(session({ viewerParticipation: 'pending' }), ME)).toBe(false)
        expect(canManageRotationPool(session({ viewerParticipation: 'rejected' }), ME)).toBe(false)
        expect(canManageRotationPool(session(), ME)).toBe(false)
    })

    it('방 세션은 명단의 권위가 match_room_members라 항상 false — 주최자도 예외가 아니다', () => {
        expect(canManageRotationPool(session({ roomId: 'r1' }), OWNER)).toBe(false)
        expect(canManageRotationPool(session({ roomId: 'r1', viewerParticipation: 'accepted' }), ME)).toBe(false)
    })
})

describe('poolMemberIds — 서버 명부와 로컬 행을 가르는 기준', () => {
    it('회원 id만 모은다(비회원은 명부의 초대 대상이 아니다)', () => {
        const ids = poolMemberIds([
            { userId: 'u1', name: 'A' },
            { name: '게스트' },
            { userId: 'u2', name: 'B' },
        ])
        expect([...ids].sort()).toEqual(['u1', 'u2'])
    })

    it('주최자는 명부에 없다 — 그래서 빌더에서 좌석 없는 행으로 나타난다', () => {
        expect(poolMemberIds([{ userId: 'u1', name: 'A' }]).has(OWNER)).toBe(false)
    })
})

describe('좌석 요약', () => {
    const seats = [seat('a', 'pending'), seat('b', 'accepted'), seat('c', 'rejected')]

    it('응답 대기·거절을 갈라 준다', () => {
        expect(pendingSeats(seats).map((s) => s.userId)).toEqual(['a'])
        expect(rejectedSeats(seats).map((s) => s.userId)).toEqual(['c'])
    })
})

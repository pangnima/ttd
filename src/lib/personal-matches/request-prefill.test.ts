import { describe, expect, it } from 'vitest'
import type { MatchRequest, MatchRequestSeat } from '@/types'
import { canReissueAsGuest, prefillFromRequest } from './request-prefill'

const seat = (role: MatchRequestSeat['role'], userId: string | undefined, acceptance: MatchRequestSeat['acceptance']): MatchRequestSeat =>
    ({ role, userId, name: role, acceptance })

const DOUBLES: MatchRequest = {
    id: 'req-1', requesterId: 'me', opponentUserId: 'opp1',
    playedAt: '2026-09-10', playedTime: '18:00', matchType: 'men_doubles', surface: 'hard',
    setScores: [], notes: '메모', courtName: '양재', status: 'pending', createdAt: '2026-09-08',
    partnerUserId: 'partner', partnerName: '파트너', partnerDominantHand: 'left', partnerNtrp: 3,
    opponent2UserId: 'opp2', opponent2Name: '상대2', opponent2DominantHand: 'right', opponent2Ntrp: 3.5,
    resultStatus: 'none', proposedSetScores: [],
    seats: [
        seat('requester', 'me', 'accepted'),
        seat('opponent', 'opp1', 'accepted'),
        seat('partner', 'partner', 'pending'),
        seat('opponent2', 'opp2', 'rejected'),
    ],
    viewerRole: 'requester',
}

describe('prefillFromRequest — 취소한 요청을 초안으로', () => {
    it('메타는 그대로, 미응답·거절 좌석만 회원 연결을 뗀다(게스트) — 이름·손잡이·NTRP는 남긴다', () => {
        const p = prefillFromRequest(DOUBLES, '상대1')
        expect(p).toMatchObject({
            playedAt: '2026-09-10', playedTime: '18:00', matchType: 'men_doubles', surface: 'hard',
            courtName: '양재', notes: '메모', setScores: [],
        })
        expect(p.opponentName).toBe('상대1')
        expect(p.opponentUserId).toBe('opp1')          // 수락한 대표는 회원 그대로
        expect(p.partnerUserId).toBeUndefined()        // 미응답 → 게스트
        expect(p.partnerName).toBe('파트너')
        expect(p.partnerDominantHand).toBe('left')
        expect(p.partnerNtrp).toBe(3)
        expect(p.opponent2UserId).toBeUndefined()      // 거절 → 게스트
        expect(p.opponent2Name).toBe('상대2')
    })

    it('대표가 미응답이면 대표도 게스트 — 프로필이 없어 손잡이·NTRP는 비어 사용자가 채운다', () => {
        const req = { ...DOUBLES, seats: DOUBLES.seats.map((s) => (s.role === 'opponent' ? { ...s, acceptance: 'pending' as const } : s)) }
        const p = prefillFromRequest(req, '상대1')
        expect(p.opponentUserId).toBeUndefined()
        expect(p.opponentName).toBe('상대1')
        expect(p.opponentDominantHand).toBeUndefined()
        expect(p.opponentNtrp).toBeUndefined()
    })

    it('전원 수락이면 회원 연결이 그대로다 — 단식은 파트너·상대2가 없다', () => {
        const singles: MatchRequest = {
            ...DOUBLES, matchType: 'singles',
            partnerUserId: undefined, partnerName: undefined, partnerDominantHand: undefined, partnerNtrp: undefined,
            opponent2UserId: undefined, opponent2Name: undefined, opponent2DominantHand: undefined, opponent2Ntrp: undefined,
            seats: [seat('requester', 'me', 'accepted'), seat('opponent', 'opp1', 'accepted')],
        }
        const p = prefillFromRequest(singles, '상대1')
        expect(p.opponentUserId).toBe('opp1')
        expect(p.partnerName).toBeUndefined()
        expect(p.opponent2UserId).toBeUndefined()
    })
})

describe('canReissueAsGuest — 버튼 노출 조건', () => {
    it('방 밖 pending 요청에 미수락 회원 좌석이 있으면 true', () => {
        expect(canReissueAsGuest(DOUBLES)).toBe(true)
    })

    it('전원 수락·비회원만 미수락·pending 아님·방 안·로테이션 파생은 false', () => {
        const allAccepted = { ...DOUBLES, seats: DOUBLES.seats.map((s) => ({ ...s, acceptance: 'accepted' as const })) }
        expect(canReissueAsGuest(allAccepted)).toBe(false)
        const guestPending = { ...DOUBLES, seats: [seat('requester', 'me', 'accepted'), seat('opponent', undefined, 'pending')] }
        expect(canReissueAsGuest(guestPending)).toBe(false)
        expect(canReissueAsGuest({ ...DOUBLES, status: 'canceled' })).toBe(false)
        expect(canReissueAsGuest({ ...DOUBLES, roomId: 'room' })).toBe(false)
        expect(canReissueAsGuest({ ...DOUBLES, rotationSessionId: 'sess' })).toBe(false)
    })
})

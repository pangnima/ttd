import { describe, expect, it } from 'vitest'
import type { MatchRequest, MatchRequestSeat, RequestAcceptance, RequestSeatRole } from '@/types'
import {
    acceptanceProgress, classifyPendingRequest, formatAcceptanceProgress,
    groupAcceptanceNames, pendingMemberCount, requiresAllMembers, viewerSideOf,
} from './participants'

const seat = (
    role: RequestSeatRole, userId: string | undefined, acceptance: MatchRequestSeat['acceptance'],
): MatchRequestSeat => ({ role, userId, name: role, acceptance })

function req(seats: MatchRequestSeat[], viewerRole?: RequestSeatRole, roomId?: string): MatchRequest {
    return {
        id: 'r1', requesterId: 'me', opponentUserId: 'opp',
        playedAt: '2026-09-07', playedTime: '10:00', matchType: 'men_doubles', surface: 'hard',
        setScores: [], status: 'pending', createdAt: '', resultStatus: 'none', proposedSetScores: [],
        seats, viewerRole, roomId,
    }
}

// 단식: 요청자 + 대표 2석 / 복식: + 파트너·상대2
const singles = (oppAcc: MatchRequestSeat['acceptance']) =>
    [seat('requester', 'me', 'accepted'), seat('opponent', 'opp', oppAcc)]
const doubles = (
    oppAcc: MatchRequestSeat['acceptance'],
    partnerAcc: MatchRequestSeat['acceptance'],
    opp2Acc: MatchRequestSeat['acceptance'],
    // null = 비회원 좌석. undefined를 넘기면 기본값 'o2'가 되살아나 의도가 뒤집힌다
    opp2UserId: string | null = 'o2',
) => [
    seat('requester', 'me', 'accepted'),
    seat('opponent', 'opp', oppAcc),
    seat('partner', 'p1', partnerAcc),
    seat('opponent2', opp2UserId ?? undefined, opp2Acc),
]

describe('viewerSideOf', () => {
    it('요청자·파트너는 요청자 팀, 대표·상대2는 상대팀', () => {
        expect(viewerSideOf('requester')).toBe('requester')
        expect(viewerSideOf('partner')).toBe('requester')
        expect(viewerSideOf('opponent')).toBe('opponent')
        expect(viewerSideOf('opponent2')).toBe('opponent')
    })

    it('역할을 모르면 요청자 관점(세트 저장 관점)이 기본', () => {
        expect(viewerSideOf(undefined)).toBe('requester')
    })
})

describe('requiresAllMembers', () => {
    it('방 밖 요청만 전원 수락', () => {
        expect(requiresAllMembers({ roomId: undefined })).toBe(true)
        expect(requiresAllMembers({ roomId: 'room-1' })).toBe(false)
    })
})

describe('acceptanceProgress', () => {
    it('회원 좌석만 분모', () => {
        expect(acceptanceProgress(doubles('accepted', 'pending', 'pending'))).toEqual({ accepted: 2, total: 4 })
    })

    it('비회원 좌석은 세지 않는다', () => {
        const seats = doubles('accepted', 'accepted', 'accepted', null)
        expect(acceptanceProgress(seats)).toEqual({ accepted: 3, total: 3 })
        expect(formatAcceptanceProgress(seats)).toBe('3/3명 수락')
    })

    it('남은 인원 수', () => {
        expect(pendingMemberCount(doubles('accepted', 'pending', 'pending'))).toBe(2)
    })
})

describe('classifyPendingRequest (방 밖 = 전원 수락)', () => {
    it('요청자는 내가 보낸 요청', () => {
        expect(classifyPendingRequest(req(doubles('pending', 'pending', 'pending'), 'requester'))).toBe('mine')
    })

    it('미응답 대표는 내 차례', () => {
        expect(classifyPendingRequest(req(doubles('pending', 'pending', 'pending'), 'opponent'))).toBe('respond')
    })

    it('미응답 파트너도 내 차례 — 0056의 핵심 변화', () => {
        expect(classifyPendingRequest(req(doubles('accepted', 'pending', 'pending'), 'partner'))).toBe('respond')
    })

    it('이미 수락한 참가자는 남은 회원을 기다린다 (취소 권한이 없어 sent로 보내면 안 된다)', () => {
        expect(classifyPendingRequest(req(doubles('accepted', 'accepted', 'pending'), 'partner'))).toBe('awaitMembers')
    })

    it('단식은 대표 1명이 곧 전원', () => {
        expect(classifyPendingRequest(req(singles('pending'), 'opponent'))).toBe('respond')
        expect(classifyPendingRequest(req(singles('pending'), 'requester'))).toBe('mine')
    })

    it('내 좌석이 없으면 관여하지 않는다', () => {
        expect(classifyPendingRequest(req(doubles('pending', 'pending', 'pending')))).toBe('awaitMembers')
    })

    it('전원 수락인데 status가 아직 pending인 과도 상태 — 대기', () => {
        expect(classifyPendingRequest(req(doubles('accepted', 'accepted', 'accepted'), 'partner'))).toBe('awaitMembers')
    })
})

describe('classifyPendingRequest (룸 요청 = 대표 1명 모델 유지)', () => {
    it('룸 요청의 파트너는 응답 대상이 아니다 — 입장이 곧 동의', () => {
        const r = req(doubles('pending', 'pending', 'pending'), 'partner', 'room-1')
        expect(classifyPendingRequest(r)).toBe('awaitMembers')
    })

    it('룸 요청의 대표는 종전대로 응답한다', () => {
        expect(classifyPendingRequest(req(doubles('pending', 'pending', 'pending'), 'opponent', 'room-1'))).toBe('respond')
    })

    it('룸 요청의 요청자는 내가 보낸 요청', () => {
        expect(classifyPendingRequest(req(doubles('pending', 'pending', 'pending'), 'requester', 'room-1'))).toBe('mine')
    })
})

describe('groupAcceptanceNames', () => {
    const s = (name: string, acceptance: RequestAcceptance | 'removed', userId?: string) =>
        ({ name, acceptance, userId })

    it('수락 · 응답 대기 · 자동 참여 · 거절 · 제외됨 순으로 이름을 묶는다', () => {
        expect(groupAcceptanceNames([
            s('제외자', 'removed', 'u4'),
            s('거절자', 'rejected', 'u3'),
            s('게스트', 'pending'),
            s('대기자', 'pending', 'u2'),
            s('수락자', 'accepted', 'u1'),
        ])).toEqual([
            { state: 'accepted', names: ['수락자'] },
            { state: 'pending', names: ['대기자'] },
            { state: 'guest', names: ['게스트'] },
            { state: 'rejected', names: ['거절자'] },
            { state: 'removed', names: ['제외자'] },
        ])
    })

    it('userId가 없으면 acceptance와 무관하게 게스트다 — 수락 대상이 아니다', () => {
        expect(groupAcceptanceNames([s('게스트', 'accepted')])).toEqual([
            { state: 'guest', names: ['게스트'] },
        ])
    })

    it('이름이 빈 좌석과 비어 있는 상태는 목록에서 사라진다', () => {
        expect(groupAcceptanceNames([s('  ', 'accepted', 'u1'), s('A', 'pending', 'u2')])).toEqual([
            { state: 'pending', names: ['A'] },
        ])
    })
})

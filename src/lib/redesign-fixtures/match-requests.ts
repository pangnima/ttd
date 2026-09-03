// 재설계 Step2c: 확인 요청 허브 더미 픽스처.
// docs/redesign/domain-model.md §2(Confirmation/Dispute 2축 상태머신)의 status × result_status 조합을 표현한다.
import type { MatchRequest } from '@/types'
import type { MatchRequestWithUser, MatchRequestCounterpart } from '@/lib/queries/match-requests'

// 픽스처 관점 '나' — 실 로그인 id와 무관한 가짜 id (개인 경기 픽스처는 실 연동 복원으로 제거됨)
const FIXTURE_SELF_ID = 'fixture-self'

function counterpart(id: string, name: string, nickname: string, deleted = false): MatchRequestCounterpart {
    return { id, name, nickname, deleted }
}

function baseRequest(overrides: Partial<MatchRequest>): MatchRequest {
    return {
        id: 'req', requesterId: FIXTURE_SELF_ID, opponentUserId: 'opp',
        playedAt: '2026-09-05', playedTime: '19:00', matchType: 'singles', surface: 'hard',
        setScores: [], status: 'pending', createdAt: '2026-09-01T00:00:00Z',
        resultStatus: 'none', proposedSetScores: [],
        ...overrides,
    }
}

// 받은 요청: pending 1건 + accepted(결과협상 none) 1건 — 축 A(status)의 상태 표현
export const dummyReceivedRequests: MatchRequestWithUser[] = [
    {
        request: baseRequest({ id: 'req-recv-pending', requesterId: 'user-x', opponentUserId: FIXTURE_SELF_ID, status: 'pending' }),
        counterpart: counterpart('user-x', '김민수', '민수'),
    },
    {
        request: baseRequest({
            id: 'req-recv-accepted', requesterId: 'user-y', opponentUserId: FIXTURE_SELF_ID,
            status: 'accepted', respondedAt: '2026-09-02T00:00:00Z',
        }),
        counterpart: counterpart('user-y', '박지훈', '지훈'),
    },
]

// 보낸 요청: rejected 1건 + canceled 1건 — status 종결 상태
export const dummySentRequests: MatchRequestWithUser[] = [
    {
        request: baseRequest({
            id: 'req-sent-rejected', requesterId: FIXTURE_SELF_ID, opponentUserId: 'user-z',
            status: 'rejected', respondedAt: '2026-08-30T00:00:00Z',
        }),
        counterpart: counterpart('user-z', '이서연', '서연'),
    },
    {
        request: baseRequest({
            id: 'req-sent-canceled', requesterId: FIXTURE_SELF_ID, opponentUserId: 'user-w',
            status: 'canceled',
        }),
        counterpart: counterpart('user-w', '탈퇴한 회원', '', true),
    },
]

// 결과 확인 대기: accepted + result_status=proposed, 제안자≠viewer — 축 B(result_status) 표현
export const dummyPendingConfirmations: MatchRequestWithUser[] = [
    {
        request: baseRequest({
            id: 'req-confirm-wait', requesterId: 'user-x', opponentUserId: FIXTURE_SELF_ID,
            status: 'accepted', resultStatus: 'proposed', proposedBy: 'user-x',
            proposedAt: '2026-09-04T00:00:00Z',
            proposedSetScores: [{ me: 6, opp: 3 }, { me: 6, opp: 4 }],
        }),
        counterpart: counterpart('user-x', '김민수', '민수'),
    },
]

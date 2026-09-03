// 재설계 Step2c: DB 연동 없이 화면 데이터 요구사항을 확정하기 위한 더미 픽스처.
// docs/redesign/domain-model.md §1(Match 라이프사이클)·§3(참가자 다형성)의 모든 상태를 최소 1건씩 표현한다.
import type { PersonalMatch, RotationSession } from '@/types'
import type { OpponentCandidate } from '@/lib/queries/users'
import type { PastOpponent } from '@/lib/queries/personal-matches'

export const FIXTURE_SELF_ID = 'fixture-self'

const OPP_A = 'fixture-user-a'
const OPP_B = 'fixture-user-b'

export const dummyPersonalMatches: PersonalMatch[] = [
    // 1) 직접기록 — 확정 단식
    {
        id: 'pm-1', userId: FIXTURE_SELF_ID, opponentName: '김민수', opponentUserId: OPP_A,
        playedAt: '2026-08-20', playedTime: '19:00', matchType: 'singles', surface: 'hard',
        setScores: [{ me: 6, opp: 4 }, { me: 6, opp: 3 }], winner: 'me', opponentNtrp: 3.0,
        createdAt: '2026-08-20T10:00:00Z',
    },
    // 2) 직접기록 — 결과 미확정 (winner null)
    {
        id: 'pm-2', userId: FIXTURE_SELF_ID, opponentName: '이서연', opponentDominantHand: 'left',
        playedAt: '2026-08-25', matchType: 'singles', surface: 'clay',
        setScores: [], winner: null, createdAt: '2026-08-25T09:00:00Z',
    },
    // 3) 상호확인 — confirmed (양측 확정)
    {
        id: 'pm-3', userId: FIXTURE_SELF_ID, opponentName: '박지훈', opponentUserId: OPP_B,
        playedAt: '2026-08-15', playedTime: '20:00', matchType: 'singles', surface: 'hard',
        setScores: [{ me: 7, opp: 5 }, { me: 4, opp: 6 }, { me: 6, opp: 2 }], winner: 'me',
        sourceRequestId: 'req-confirmed', opponentNtrp: 3.5,
        confirmation: { requestId: 'req-confirmed', status: 'confirmed', proposedByMe: true, proposedSets: [] },
        createdAt: '2026-08-15T11:00:00Z',
    },
    // 4) 상호확인 — proposed (내가 제안, 상대 확인 대기)
    {
        id: 'pm-4', userId: FIXTURE_SELF_ID, opponentName: '최유진', opponentUserId: OPP_A,
        playedAt: '2026-08-28', matchType: 'singles', surface: 'hard',
        setScores: [], winner: null, sourceRequestId: 'req-proposed-by-me',
        confirmation: {
            requestId: 'req-proposed-by-me', status: 'proposed', proposedByMe: true,
            proposedSets: [{ me: 6, opp: 2 }, { me: 6, opp: 4 }],
        },
        createdAt: '2026-08-28T08:00:00Z',
    },
    // 5) 상호확인 — disputed (이의 제기됨, 재제안 가능)
    {
        id: 'pm-5', userId: FIXTURE_SELF_ID, opponentName: '정하늘', opponentUserId: OPP_B,
        playedAt: '2026-08-10', matchType: 'singles', surface: 'grass',
        setScores: [], winner: null, sourceRequestId: 'req-disputed',
        confirmation: {
            requestId: 'req-disputed', status: 'disputed', proposedByMe: false,
            proposedSets: [{ me: 6, opp: 7 }, { me: 6, opp: 3 }, { me: 3, opp: 6 }],
            disputeReason: '2세트 스코어가 실제와 다릅니다',
        },
        createdAt: '2026-08-10T07:00:00Z',
    },
    // 6) 직접기록 복식 — 페어 고정, 확정 (참가자 다형성: partner/opponent2 4컬럼)
    {
        id: 'pm-6', userId: FIXTURE_SELF_ID, opponentName: '한도윤', opponentUserId: OPP_A, opponentNtrp: 3.0,
        partnerName: '오수아', partnerDominantHand: 'left', partnerNtrp: 3.5,
        opponent2Name: '강태오', opponent2Ntrp: 2.5,
        playedAt: '2026-08-05', playedTime: '18:00', matchType: 'mixed_doubles', surface: 'hard',
        setScores: [
            { me: 6, opp: 3, myAd: 'me', oppAd: 'opponent' },
            { me: 4, opp: 6, myAd: 'partner', oppAd: 'opponent2' },
            { me: 7, opp: 6, myAd: 'me', oppAd: 'opponent' },
        ],
        winner: 'me', createdAt: '2026-08-05T09:00:00Z',
    },
    // 7) 로테이션 분해 결과 — finalize_rotation_session 이후에는 일반 확정 복식과 동일 모양
    {
        id: 'pm-7', userId: FIXTURE_SELF_ID, opponentName: '윤서준',
        partnerName: '임하은', opponent2Name: '조은우',
        playedAt: '2026-08-01', playedTime: '17:00', matchType: 'men_doubles', surface: 'hard',
        setScores: [{ me: 6, opp: 2, myAd: 'me', oppAd: 'opponent' }], winner: 'me',
        createdAt: '2026-08-01T18:00:00Z',
    },
]

// 결과 입력 대기 로테이션 세션 (선수 풀만 존재, 게임 미구성)
export const dummyRotationSessions: RotationSession[] = [
    {
        id: 'rot-1', userId: FIXTURE_SELF_ID, playedAt: '2026-09-01', playedTime: '19:00',
        matchType: 'men_doubles', surface: 'hard', notes: '토요일 정기모임 로테이션',
        players: [
            { name: '김민수', userId: OPP_A, hand: 'right', ntrp: 3.0 },
            { name: '박지훈', userId: OPP_B, hand: 'right', ntrp: 3.5 },
            { name: '이서연', hand: 'left', ntrp: 2.5 },
            { name: '최유진', ntrp: 3.0 },
        ],
        createdAt: '2026-09-01T12:00:00Z',
    },
]

export const dummyOpponentCandidates: OpponentCandidate[] = [
    { id: OPP_A, name: '김민수', nickname: '민수', ntrp: 3.0, personalNtrp: 3.1, dominantHand: 'right', isGuest: false, clubNames: ['강남 테니스 클럽'] },
    { id: OPP_B, name: '박지훈', nickname: '지훈', ntrp: 3.5, dominantHand: 'right', isGuest: false, clubNames: ['강남 테니스 클럽', '주말 소셜'] },
    { id: 'fixture-user-c', name: '이서연', ntrp: 2.5, dominantHand: 'left', isGuest: true, clubNames: [] },
]

export const dummyPastOpponents: PastOpponent[] = [
    { name: '오수아', hand: 'left', ntrp: 3.5 },
    { name: '강태오', ntrp: 2.5 },
]

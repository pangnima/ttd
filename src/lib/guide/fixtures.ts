import type {
    MatchRoomDetail, MatchRoomGame, MatchRoomInvite, MatchRoomMember, MatchRoomMeta, MatchRoomSummary,
    PersonalMatch, PersonalMatchConfirmation,
} from '@/types'
import { viewerRoomTurn, type RoomTurnSummary } from '@/lib/match-rooms/room-turn'

/**
 * 사용 가이드의 예시 데이터 — **실제 도메인 타입의 리터럴**(Week 58).
 *
 * 가이드는 화면 캡처 대신 실제 카드·배지 컴포넌트를 이 값으로 렌더한다. 캡처는 테마(다크/라이트가 hue까지
 * 다르다)와 어긋나고 UI가 바뀌면 조용히 낡지만, 픽스처는 타입이 바뀌면 tsc가, 판정 규칙이 바뀌면
 * `fixtures.test.ts`가 시끄럽게 실패한다 — 문구 단일 출처(`sections.ts`)와 같은 원리를 그림에 적용한 것.
 *
 * 이름은 전부 가공이고 id는 UUID 모양이다 — 예시 안의 링크는 `inert`로 막히지만 뷰포트 프리페치는 돌 수
 * 있어, 잘못된 uuid 캐스트 로그조차 남기지 않는다. 뷰어는 김서연('나').
 */

export const GUIDE_VIEWER_ID = '00000000-0000-4000-8000-000000000001'
const OPPONENT_ID = '00000000-0000-4000-8000-000000000002'
const OTHER_HOST_ID = '00000000-0000-4000-8000-000000000003'
const INVITER_ID = '00000000-0000-4000-8000-000000000004'

const ROOM_OTHER = '00000000-0000-4000-8000-0000000000a1'
const ROOM_JOINED = '00000000-0000-4000-8000-0000000000a2'
const ROOM_MINE = '00000000-0000-4000-8000-0000000000a3'
const ROOM_INVITE = '00000000-0000-4000-8000-0000000000a4'

const PLAYED_AT = '2026-09-20'
const PLAYED_TIME = '10:00'
const DURATION = 120
const COURT = '잠실 3번 코트'

const meta = (id: string, hostUserId: string): MatchRoomMeta => ({
    id, hostUserId, sourceKind: 'direct',
    playedAt: PLAYED_AT, playedTime: PLAYED_TIME, matchType: 'singles', surface: 'hard', courtName: COURT,
    durationMinutes: DURATION, courtCount: 1, isSettled: false, isListed: true,
})

const member = (over: Pick<MatchRoomMember, 'userId' | 'name' | 'nickname' | 'role' | 'status'> & Partial<MatchRoomMember>): MatchRoomMember =>
    ({ deleted: false, hand: 'right', ...over })

// ── 매칭 리스트: 아직 안 들어간 남의 매칭 / 내가 참가해 결과 입력 차례가 온 매칭 ──
export const GUIDE_LIST_ROOMS: MatchRoomSummary[] = [
    {
        ...meta(ROOM_OTHER, OTHER_HOST_ID), joinedCount: 2,
        host: { id: OTHER_HOST_ID, name: '이도윤', nickname: '도윤', deleted: false },
    },
    {
        ...meta(ROOM_JOINED, OTHER_HOST_ID), playedTime: '14:00', courtName: '올림픽공원 5번 코트', joinedCount: 3,
        host: { id: OTHER_HOST_ID, name: '이도윤', nickname: '도윤', deleted: false },
        viewer: { role: 'player', status: 'joined' },
    },
]
export const GUIDE_LIST_TURNS: Map<string, RoomTurnSummary> = new Map([[ROOM_JOINED, { turn: 'enterResult', count: 1 }]])

// ── 참여 중인 매칭: 나를 초대한 매칭 ──
export const GUIDE_INVITE: MatchRoomInvite = {
    roomId: ROOM_INVITE, hostName: '최하늘', hostNickname: '하늘',
    playedAt: '2026-09-27', playedTime: '18:00', durationMinutes: DURATION, matchType: 'singles', courtName: '양재 2번 코트',
    sourceRole: 'opponent',
}

// ── 내가 연 매칭 안의 게임 셋 — 결과 미입력 → 결과 확인 대기 → 확정 (E2E S1 1.14 → 1.17 → 1.19) ──
const game = (over: Pick<MatchRoomGame, 'id' | 'sourceRequestId' | 'resultStatus'> & Partial<MatchRoomGame>): MatchRoomGame => ({
    matchType: 'singles', setScores: [],
    participants: [{ role: 'opponent', name: '박지훈', userId: OPPONENT_ID }],
    ownerUserId: GUIDE_VIEWER_ID, ownerName: '김서연', sourceType: 'confirmation',
    ...over,
})
const REQ_NONE = '00000000-0000-4000-8000-0000000000c1'
const REQ_PROPOSED = '00000000-0000-4000-8000-0000000000c2'
const REQ_SETTLED = '00000000-0000-4000-8000-0000000000c3'

export const GUIDE_GAMES: MatchRoomGame[] = [
    game({ id: '00000000-0000-4000-8000-0000000000b1', sourceRequestId: REQ_NONE, resultStatus: 'none' }),
    game({ id: '00000000-0000-4000-8000-0000000000b2', sourceRequestId: REQ_PROPOSED, resultStatus: 'proposed' }),
    game({ id: '00000000-0000-4000-8000-0000000000b3', sourceRequestId: REQ_SETTLED, resultStatus: 'confirmed', setScores: [{ me: 6, opp: 3 }] }),
]

const confirmation = (requestId: string, over: Partial<PersonalMatchConfirmation>): PersonalMatchConfirmation => ({
    requestId, status: 'none', proposedByMe: false, confirmedByMe: false,
    confirmProgress: { confirmed: 0, total: 2 }, confirmedUserIds: [], inactiveUserIds: [],
    proposedSets: [], disputedByMe: false, disputeRound: 0, viewerIsParty: true,
    ...over,
})

/** 확정 게임(REQ_SETTLED)은 일부러 없다 — 넘기면 [결과 정정]이 그려진다 */
export const GUIDE_CONFIRMATIONS: Record<string, PersonalMatchConfirmation> = {
    [REQ_NONE]: confirmation(REQ_NONE, {}),
    [REQ_PROPOSED]: confirmation(REQ_PROPOSED, {
        status: 'proposed', proposedBy: OPPONENT_ID,
        confirmProgress: { confirmed: 1, total: 2 }, confirmedUserIds: [OPPONENT_ID], proposedSets: [{ me: 3, opp: 6 }],
    }),
}

export const GUIDE_ROOM_DETAIL: MatchRoomDetail = {
    room: { ...meta(ROOM_MINE, GUIDE_VIEWER_ID), createdAt: `${PLAYED_AT}T00:00:00Z` },
    host: { id: GUIDE_VIEWER_ID, name: '김서연', nickname: '서연', deleted: false },
    viewer: { role: 'host', status: 'joined' },
    members: [
        member({ userId: GUIDE_VIEWER_ID, name: '김서연', nickname: '서연', role: 'host', status: 'joined', ntrp: 3.5 }),
        member({ userId: OPPONENT_ID, name: '박지훈', nickname: '지훈', role: 'player', status: 'joined', ntrp: 3.5, sourceRole: 'opponent' }),
    ],
    guests: [],
    source: { kind: 'direct' },
    games: GUIDE_GAMES,
}

/** 내 차례 — 손으로 적지 않고 실제 판정에서 파생한다(게임 둘 중 「결과 확인」이 우선) */
export const GUIDE_ROOM_TURN: RoomTurnSummary | null = viewerRoomTurn(GUIDE_GAMES, GUIDE_VIEWER_ID, GUIDE_CONFIRMATIONS)

/** 참여 중인 매칭 카드용 — 위 매칭의 요약 */
export const GUIDE_MY_ROOM: MatchRoomSummary = {
    ...GUIDE_ROOM_DETAIL.room, joinedCount: 2, host: GUIDE_ROOM_DETAIL.host, viewer: GUIDE_ROOM_DETAIL.viewer,
}

// ── 용어: 명단 한 벌 — 호스트·참가·초대 대기·비회원 ──
export const GUIDE_MEMBERS_DETAIL: MatchRoomDetail = {
    ...GUIDE_ROOM_DETAIL,
    members: [
        ...GUIDE_ROOM_DETAIL.members,
        member({ userId: INVITER_ID, name: '최하늘', nickname: '하늘', role: 'player', status: 'invited', ntrp: 4.0, hand: 'left' }),
    ],
    // createdBy를 뷰어가 아닌 사람으로 — 본인이 부른 비회원에는 [빼기]가 붙는다
    guests: [{ id: '00000000-0000-4000-8000-0000000000d1', name: '강민준', ntrp: 3.0, createdBy: OPPONENT_ID }],
}

// ── 개인 경기 결과: 확정 게임이 전적으로 올라온 카드 (1세트라 「승」 배지 — 2세트부터는 'N게임 · …') ──
export const GUIDE_PERSONAL_MATCH: PersonalMatch = {
    id: GUIDE_GAMES[2].id, userId: GUIDE_VIEWER_ID, opponentName: '박지훈', opponentUserId: OPPONENT_ID,
    playedAt: PLAYED_AT, playedTime: PLAYED_TIME, matchType: 'singles', surface: 'hard', courtName: COURT,
    setScores: [{ me: 6, opp: 3 }], sourceRequestId: REQ_SETTLED, sourceType: 'confirmation', roomId: ROOM_MINE,
    createdAt: `${PLAYED_AT}T12:00:00Z`,
}

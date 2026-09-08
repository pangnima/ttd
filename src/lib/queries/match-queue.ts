import 'server-only'

import { cache } from 'react'
import { fetchPendingPersonalMatches } from '@/lib/queries/personal-matches'
import { fetchMyMatchRequests, type MatchRequestWithUser } from '@/lib/queries/match-requests'
import { fetchMyRoomMemberships } from '@/lib/queries/match-rooms'
import { fetchQueueRotationSessions, fetchRotationSessionGamesBatch } from '@/lib/queries/rotation-sessions'
import {
    EMPTY_QUEUE_COUNTS, classifyPendingMatch, tallyBuckets,
    type MatchQueueBucket, type MatchQueueCounts,
} from '@/lib/match-requests/queue'
import { classifyPendingRequest, groupRotationRequests } from '@/lib/match-requests/participants'
import { classifyRotationSession } from '@/lib/personal-matches/rotation-participation'
import type { EnteredRotationGame } from '@/lib/personal-matches/rotation-entered'
import type { ScheduleSlot } from '@/lib/personal-matches/schedule-conflict'
import type { MatchRoomInvite, PersonalMatch, RotationSession } from '@/types'

/**
 * 확인 요청 허브 · 개인 경기 결과 요약 배너 · 사이드바 뱃지의 **단일 데이터 소스**.
 *
 * 미확정 상태는 두 축으로 나뉜다:
 *  - A축: 아직 personal_matches 행이 없는 단계 — pending 요청 · 방 초대 · 미입력 로테이션 세션
 *  - B축: 경기가 된 뒤 결과가 비어 있는 행(has_result=false) — classifyPendingMatch가 버킷으로 나눈다
 *    (이의 상태는 이의 탭 전용 버킷 2종으로 — 3탭은 상호배타, 0061)
 *
 * 확정 경기는 여기 절대 들어오지 않는다(개인 경기 결과 화면 소관) — 분할 술어는 has_result 하나다.
 */

export type PendingMatchEntry = { match: PersonalMatch; bucket: MatchQueueBucket }

export type MatchQueue = {
    // ── A축 ──
    /** 내가 수락/거절해야 할 요청 (status='pending', 내 좌석이 미응답) */
    receivedRequests: MatchRequestWithUser[]
    /** 상대 수락을 기다리는 내 요청 (status='pending', 내가 요청자) */
    sentRequests: MatchRequestWithUser[]
    /** 내 응답은 끝났고 남은 회원의 수락을 기다리는 요청 (0056) — 참가자는 취소 권한이 없어 sent와 구분한다 */
    awaitingMemberRequests: MatchRequestWithUser[]
    /** 종료된 요청 이력 (rejected|canceled, 양방향) */
    closedRequests: MatchRequestWithUser[]
    roomInvites: MatchRoomInvite[]
    /** 내가 수락/거절해야 할 로테이션 일정 (0057) — 경기 전이라 아직 요청도 기록도 없다 */
    sessionInvites: RotationSession[]
    /** 내 수락은 끝났고 주최자의 결과 입력을 기다리는 세션 (0057) */
    awaitingOwnerSessions: RotationSession[]
    /**
     * 미응답 좌석이 남아 결과 입력이 열리지 않은 세션 (0064) — 주최자와 이미 수락한 참가자가 본다.
     * 이 목록이 없으면 게이트를 좁히는 순간 **주최자의 세션이 허브에서 통째로 사라진다**
     * (소유자는 좌석 행이 없어 respond/awaitOwner 어디에도 걸리지 않는다).
     */
    awaitingSeatSessions: RotationSession[]
    // ── B축 ──
    pendingMatches: PendingMatchEntry[]
    /** 내가 지금 결과를 입력할 수 있는 세션만 — 수락 전 세션이 섞이면 눌리지 않는 버튼이 뜬다 */
    rotationSessions: RotationSession[]
    /** 이미 게임이 등록된 세션 id — 카드는 계속 보이되 뱃지 카운트에서만 제외 */
    enteredSessionIds: string[]
    /**
     * 세션 id → **등록된 게임 전량**(0063, 0064에서 '내가 넣은 것'→'누가 넣었든'으로 확대).
     * 카드 배지·빌더의 '등록된 게임'이 이걸 읽어 같은 게임을 두 번 넣는 것을 막는다.
     */
    enteredGamesBySession: Map<string, EnteredRotationGame[]>
    counts: MatchQueueCounts
}

const EMPTY_QUEUE: MatchQueue = {
    receivedRequests: [], sentRequests: [], awaitingMemberRequests: [], closedRequests: [], roomInvites: [],
    sessionInvites: [], awaitingOwnerSessions: [], awaitingSeatSessions: [],
    pendingMatches: [], rotationSessions: [], enteredSessionIds: [],
    enteredGamesBySession: new Map(), counts: EMPTY_QUEUE_COUNTS,
}

/**
 * React cache()로 감싸 같은 요청 안에서는 1회만 실행된다 —
 * (main)/layout.tsx의 뱃지와 화면 본문이 같은 함수를 불러도 쿼리는 한 벌이다.
 */
export const fetchMatchQueue = cache(async (userId: string): Promise<MatchQueue> => {
    // 웨이브 1 — 서로 의존 없는 3갈래 (각각 내부에서 필요한 2차 조회를 한다)
    const [pending, requests, memberships] = await Promise.all([
        fetchPendingPersonalMatches(userId),
        fetchMyMatchRequests(userId),
        fetchMyRoomMemberships(userId),
    ])

    // 웨이브 2 — 방 멤버십을 알아야 방 세션을 좁힐 수 있다
    const allSessions = await fetchQueueRotationSessions(userId, memberships.joinedRoomIds)

    // 레인 분리(0057). 'enter'만 결과 입력 목록에 넣는다 — 수락 전 세션에 [결과 입력]을 그리면
    // finalize가 not_session_participant로 거부하는 버튼이 화면에 남는다.
    const joined = new Set(memberships.joinedRoomIds)
    const sessionInvites: RotationSession[] = []
    const awaitingOwnerSessions: RotationSession[] = []
    const awaitingSeatSessions: RotationSession[] = []
    const rotationSessions: RotationSession[] = []
    for (const s of allSessions) {
        const lane = classifyRotationSession(s, userId, joined)
        if (lane === 'enter') rotationSessions.push(s)
        else if (lane === 'respond') sessionInvites.push(s)
        else if (lane === 'awaitSeats') awaitingSeatSessions.push(s)
        else if (lane === 'awaitOwner') awaitingOwnerSessions.push(s)
    }

    // 웨이브 3 — 이미 게임이 등록된 세션(0050 이후 방 세션은, 0057 이후 좌석 있는 방 밖 세션도 남는다).
    // awaitSeats 세션도 함께 받는다(0064) — 「상대 대기」 탭에서도 같은 카드를 그리고, 0064 이전에
    // 선적립된 게임이 남아 있을 수 있어 "무엇이 이미 들어갔는지"를 말해야 한다.
    const enteredGamesBySession = await fetchRotationSessionGamesBatch(
        [...rotationSessions, ...awaitingSeatSessions].map((s) => s.id),
    )
    // 뱃지에서 빼는 것은 **입력 가능한** 세션만이다 — awaitSeats는 애초에 enterResult로 세지 않는다
    const enteredSessionIds = rotationSessions
        .filter((s) => (enteredGamesBySession.get(s.id) ?? []).length > 0)
        .map((s) => s.id)

    const pendingMatches: PendingMatchEntry[] = pending.map((match) => ({
        match, bucket: classifyPendingMatch(match),
    }))

    const receivedRequests: MatchRequestWithUser[] = []
    const sentRequests: MatchRequestWithUser[] = []
    const awaitingMemberRequests: MatchRequestWithUser[] = []
    const closedRequests: MatchRequestWithUser[] = []
    for (const item of requests) {
        const { status } = item.request
        // accepted는 personal_matches 행(B축)이 대신 표현한다 — 같은 경기를 두 목록에 넣지 않기 위한 경계
        if (status === 'pending') {
            const lane = classifyPendingRequest(item.request)
            if (lane === 'respond') receivedRequests.push(item)
            else if (lane === 'mine') sentRequests.push(item)
            else awaitingMemberRequests.push(item)
        } else if (status === 'rejected' || status === 'canceled') closedRequests.push(item)
    }

    const entered = new Set(enteredSessionIds)
    const unenteredSessions = rotationSessions.filter((s) => !entered.has(s.id)).length
    const tallied = tallyBuckets(pendingMatches.map((p) => p.bucket))

    // 같은 세션을 두 장으로 그리지 않는다(0063). 주최자가 수락을 기다리지 않고 결과를 먼저 넣으면
    // 한 세션이 「게임 참여 확인」(요청)과 「일정 초대」(좌석) 양쪽에 동시에 존재한다 —
    // 남기는 쪽은 게임 묶음 카드다(스코어·게임 수까지 보여주고, 그 [전체 수락]이 좌석까지 처리한다).
    const grouped = groupRotationRequests(receivedRequests)
    const requestedSessionIds = new Set(grouped.sessions.map((s) => s.sessionId))
    const dedupedInvites = sessionInvites.filter((s) => !requestedSessionIds.has(s.id))

    return {
        receivedRequests, sentRequests, awaitingMemberRequests, closedRequests,
        roomInvites: memberships.invites,
        sessionInvites: dedupedInvites, awaitingOwnerSessions, awaitingSeatSessions,
        pendingMatches, rotationSessions, enteredSessionIds,
        enteredGamesBySession,
        counts: {
            // 참여 동의의 단위는 게임이 아니라 세션이다(0056) — 3게임 세션은 카드 한 장이므로 1건으로 센다
            participation: grouped.sessions.length + grouped.singles.length
                + memberships.invites.length + dedupedInvites.length,
            confirmResult: tallied.confirmResult,
            enterResult: tallied.enterResult + unenteredSessions,
            fillLineup: tallied.fillLineup,
            waiting: tallied.waiting + sentRequests.length + awaitingMemberRequests.length
                + awaitingOwnerSessions.length + awaitingSeatSessions.length,
            // 이의 탭(0061·0062) — 넷 다 B축 행뿐이라 조립 단계에서 더할 것이 없다
            reenterResult: tallied.reenterResult,
            disputeWaiting: tallied.disputeWaiting,
            reentryReview: tallied.reentryReview,
            reentryWaiting: tallied.reentryWaiting,
            // 카드는 보이지만 내 차례가 아닌 세션 — 뱃지에서는 빠지고 목록 건수에만 더해진다(hub-totals.ts)
            enteredSessions: enteredSessionIds.length,
        },
    }
})

/** 빈 큐 — 비로그인 등 조회를 건너뛰는 경로가 같은 형태를 쓰도록 */
export function emptyMatchQueue(): MatchQueue {
    return EMPTY_QUEUE
}

/**
 * 큐 → 중복 일정 경고용 슬롯 목록 (0057). 큐는 이미 **미확정 일정 전량**을 담고 있으므로
 * 새 쿼리 없이 파생한다(fetchMatchQueue는 React cache라 레이아웃과 같은 한 벌을 쓴다).
 * 확정된 경기는 큐에 없다 — 이미 끝난 경기와의 시각 일치는 중복 일정이 아니다.
 */
export function scheduleSlotsOf(queue: MatchQueue): ScheduleSlot[] {
    const label = (opponent: string | undefined, kind: string) => `${opponent || kind}`
    return [
        ...queue.pendingMatches.map(({ match }) => ({
            playedAt: match.playedAt,
            playedTime: match.playedTime,
            label: label(match.opponentName, '기록'),
        })),
        ...queue.sentRequests.map(({ request }) => ({
            playedAt: request.playedAt, playedTime: request.playedTime, label: label(undefined, '보낸 확인 요청'),
        })),
        ...queue.awaitingMemberRequests.map(({ request }) => ({
            playedAt: request.playedAt, playedTime: request.playedTime, label: label(undefined, '참여 대기 중인 경기'),
        })),
        ...[...queue.rotationSessions, ...queue.awaitingOwnerSessions, ...queue.awaitingSeatSessions].map((s) => ({
            playedAt: s.playedAt, playedTime: s.playedTime, label: '로테이션 경기',
        })),
    ]
}

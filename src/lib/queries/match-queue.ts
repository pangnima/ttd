import 'server-only'

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { fetchPendingPersonalMatches } from '@/lib/queries/personal-matches'
import { fetchMyMatchRequests, type MatchRequestWithUser } from '@/lib/queries/match-requests'
import { fetchMyRoomMemberships } from '@/lib/queries/match-rooms'
import { fetchQueueRotationSessions } from '@/lib/queries/rotation-sessions'
import {
    EMPTY_QUEUE_COUNTS, classifyPendingMatch, tallyBuckets,
    type MatchQueueBucket, type MatchQueueCounts,
} from '@/lib/match-requests/queue'
import type { MatchRoomInvite, PersonalMatch, RotationSession } from '@/types'

/**
 * 확인 요청 허브 · 개인 경기 결과 요약 배너 · 사이드바 뱃지의 **단일 데이터 소스**.
 *
 * 미확정 상태는 두 축으로 나뉜다:
 *  - A축: 아직 personal_matches 행이 없는 단계 — pending 요청 · 방 초대 · 미입력 로테이션 세션
 *  - B축: 경기가 된 뒤 결과가 비어 있는 행(has_result=false) — classifyPendingMatch가 버킷으로 나눈다
 *
 * 확정 경기는 여기 절대 들어오지 않는다(개인 경기 결과 화면 소관) — 분할 술어는 has_result 하나다.
 */

export type PendingMatchEntry = { match: PersonalMatch; bucket: MatchQueueBucket }

export type MatchQueue = {
    // ── A축 ──
    /** 내가 수락/거절해야 할 요청 (status='pending', 내가 대표 확인자) */
    receivedRequests: MatchRequestWithUser[]
    /** 상대 수락을 기다리는 내 요청 (status='pending', 내가 요청자) */
    sentRequests: MatchRequestWithUser[]
    /** 종료된 요청 이력 (rejected|canceled, 양방향) */
    closedRequests: MatchRequestWithUser[]
    roomInvites: MatchRoomInvite[]
    // ── B축 ──
    pendingMatches: PendingMatchEntry[]
    rotationSessions: RotationSession[]
    /** 내가 이미 게임을 넣은 방 세션 id — 카드는 계속 보이되 뱃지 카운트에서만 제외 */
    enteredSessionIds: string[]
    counts: MatchQueueCounts
}

const EMPTY_QUEUE: MatchQueue = {
    receivedRequests: [], sentRequests: [], closedRequests: [], roomInvites: [],
    pendingMatches: [], rotationSessions: [], enteredSessionIds: [], counts: EMPTY_QUEUE_COUNTS,
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
    const rotationSessions = await fetchQueueRotationSessions(userId, memberships.joinedRoomIds)
    // 웨이브 3 — 내가 이미 게임을 넣은 세션(0050 이후 방 세션은 finalize 후에도 남는다)
    const enteredSessionIds = await fetchEnteredSessionIds(userId, rotationSessions.map((s) => s.id))

    const pendingMatches: PendingMatchEntry[] = pending.map((match) => ({
        match, bucket: classifyPendingMatch(match),
    }))

    const receivedRequests: MatchRequestWithUser[] = []
    const sentRequests: MatchRequestWithUser[] = []
    const closedRequests: MatchRequestWithUser[] = []
    for (const item of requests) {
        const { status, requesterId } = item.request
        // accepted는 personal_matches 행(B축)이 대신 표현한다 — 같은 경기를 두 목록에 넣지 않기 위한 경계
        if (status === 'pending') (requesterId === userId ? sentRequests : receivedRequests).push(item)
        else if (status === 'rejected' || status === 'canceled') closedRequests.push(item)
    }

    const entered = new Set(enteredSessionIds)
    const unenteredSessions = rotationSessions.filter((s) => !entered.has(s.id)).length
    const tallied = tallyBuckets(pendingMatches.map((p) => p.bucket))

    return {
        receivedRequests, sentRequests, closedRequests,
        roomInvites: memberships.invites,
        pendingMatches, rotationSessions, enteredSessionIds,
        counts: {
            participation: receivedRequests.length + memberships.invites.length,
            confirmResult: tallied.confirmResult,
            enterResult: tallied.enterResult + unenteredSessions,
            fillLineup: tallied.fillLineup,
            waiting: tallied.waiting + sentRequests.length,
        },
    }
})

/** 빈 큐 — 비로그인 등 조회를 건너뛰는 경로가 같은 형태를 쓰도록 */
export function emptyMatchQueue(): MatchQueue {
    return EMPTY_QUEUE
}

/**
 * 주어진 세션들 중 내 기록이 이미 들어간 세션 id.
 * 확정/미확정을 가리지 않으므로 has_result 필터를 걸지 않는다(즉시 확정된 게임도 '입력함'이다).
 */
async function fetchEnteredSessionIds(userId: string, sessionIds: string[]): Promise<string[]> {
    if (sessionIds.length === 0) return []
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('personal_matches')
        .select('rotation_session_id')
        .eq('user_id', userId)
        .in('rotation_session_id', sessionIds)
    if (error || !data) return []
    return [...new Set(data.map((row) => row.rotation_session_id).filter((id): id is string => !!id))]
}

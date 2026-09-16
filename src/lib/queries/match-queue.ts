import 'server-only'

import { cache } from 'react'
import { fetchPendingPersonalMatches } from '@/lib/queries/personal-matches'
import { fetchMyRoomMemberships } from '@/lib/queries/match-rooms'
import { fetchQueueRotationSessions, fetchRotationSessionGamesBatch } from '@/lib/queries/rotation-sessions'
import { classifyPendingMatch, type MatchQueueBucket } from '@/lib/match-requests/queue'
import { classifyRotationSession } from '@/lib/personal-matches/rotation-participation'
import type { EnteredRotationGame } from '@/lib/personal-matches/rotation-entered'
import type { ScheduleSlot } from '@/lib/personal-matches/schedule-conflict'
import type { MatchRoomInvite, PersonalMatch, RotationSession } from '@/types'

/**
 * 미확정 경기의 **단일 데이터 소스** — 매칭 리스트 작업 큐(room-queue.ts) · 내 경기 결과 · 사이드바 뱃지.
 *
 * 미확정 상태는 두 축으로 나뉜다:
 *  - A축: 아직 personal_matches 행이 없는 단계 — 방 초대 · 미입력 로테이션 세션
 *  - B축: 경기가 된 뒤 결과가 비어 있는 행(has_result=false) — classifyPendingMatch가 버킷으로 나눈다
 *
 * 확정 경기는 여기 절대 들어오지 않는다(내 경기 결과 화면 소관) — 분할 술어는 has_result 하나다.
 *
 * ⚠ 방 밖 확인 요청(match_requests) 축은 Week 39에 빠졌다. 회원이 끼는 경기가 전부 매칭 룸을 거치면서
 * 방 밖 pending 요청이 더는 생기지 않고, 그 승인 화면(허브)도 함께 사라졌다 —
 * 덕분에 레이아웃이 매 요청 돌리던 `fetchMyMatchRequests` 전량 조회도 없어졌다.
 */

export type PendingMatchEntry = { match: PersonalMatch; bucket: MatchQueueBucket }

export type MatchQueue = {
    // ── A축 ──
    /** 아직 응답하지 않은 방 초대 — 매칭 리스트 「나를 초대한 매칭」 */
    roomInvites: MatchRoomInvite[]
    /**
     * 미응답 좌석이 남아 결과 입력이 열리지 않은 세션 (0064) — 주최자와 이미 수락한 참가자가 본다.
     * 방 세션의 좌석은 입장이 곧 동의라 accepted로 태어나므로(0057), 여기 남는 것은 좌석이 붙은 레거시 방 밖 세션뿐이다.
     */
    awaitingSeatSessions: RotationSession[]
    // ── B축 ──
    pendingMatches: PendingMatchEntry[]
    /** 내가 지금 결과를 입력할 수 있는 세션만 — 수락 전 세션이 섞이면 눌리지 않는 버튼이 뜬다 */
    rotationSessions: RotationSession[]
    /**
     * 세션 id → **등록된 게임 전량**(0063, 0064에서 '내가 넣은 것'→'누가 넣었든'으로 확대).
     * 카드 배지·빌더의 '등록된 게임'이 이걸 읽어 같은 게임을 두 번 넣는 것을 막는다.
     */
    enteredGamesBySession: Map<string, EnteredRotationGame[]>
    /**
     * 지금 참가(joined) 중인 방 id (Week 57). 온보딩 「첫 매칭 참여하기」 done 판정과
     * 매칭 리스트 안내의 "한 번도 참가한 적 없음" 신호가 읽는다 — 조회는 memberships가 이미 하고
     * 있었고 여기서는 노출만 하므로 쿼리가 늘지 않는다.
     */
    joinedRoomIds: string[]
}

const EMPTY_QUEUE: MatchQueue = {
    roomInvites: [], awaitingSeatSessions: [],
    pendingMatches: [], rotationSessions: [], enteredGamesBySession: new Map(),
    joinedRoomIds: [],
}

/**
 * React cache()로 감싸 같은 요청 안에서는 1회만 실행된다 —
 * 레이아웃의 뱃지(room-queue 경유)와 화면 본문이 같은 함수를 불러도 쿼리는 한 벌이다.
 */
export const fetchMatchQueue = cache(async (userId: string): Promise<MatchQueue> => {
    // 웨이브 1 — 서로 의존 없는 2갈래
    const [pending, memberships] = await Promise.all([
        fetchPendingPersonalMatches(userId),
        fetchMyRoomMemberships(userId),
    ])

    // 웨이브 2 — 방 멤버십을 알아야 방 세션을 좁힐 수 있다
    const allSessions = await fetchQueueRotationSessions(userId, memberships.joinedRoomIds)

    // 레인 분리(0057). 'enter'만 결과 입력 목록에 넣는다 — 수락 전 세션에 [결과 입력]을 그리면
    // finalize가 not_session_participant로 거부하는 버튼이 화면에 남는다.
    const joined = new Set(memberships.joinedRoomIds)
    const awaitingSeatSessions: RotationSession[] = []
    const rotationSessions: RotationSession[] = []
    for (const s of allSessions) {
        const lane = classifyRotationSession(s, userId, joined)
        if (lane === 'enter') rotationSessions.push(s)
        else if (lane === 'awaitSeats') awaitingSeatSessions.push(s)
    }

    // 웨이브 3 — 이미 게임이 등록된 세션. awaitSeats도 함께 받는다(0064) —
    // 0064 이전에 선적립된 게임이 남아 있을 수 있어 "무엇이 이미 들어갔는지"를 말해야 한다.
    const enteredGamesBySession = await fetchRotationSessionGamesBatch(
        [...rotationSessions, ...awaitingSeatSessions].map((s) => s.id),
    )
    const pendingMatches: PendingMatchEntry[] = pending.map((match) => ({
        match, bucket: classifyPendingMatch(match),
    }))

    return {
        roomInvites: memberships.invites,
        awaitingSeatSessions,
        pendingMatches, rotationSessions,
        enteredGamesBySession,
        joinedRoomIds: memberships.joinedRoomIds,
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
    return [
        ...queue.pendingMatches.map(({ match }) => ({
            playedAt: match.playedAt,
            playedTime: match.playedTime,
            label: match.opponentName || '기록',
        })),
        ...[...queue.rotationSessions, ...queue.awaitingSeatSessions].map((s) => ({
            playedAt: s.playedAt, playedTime: s.playedTime, label: '로테이션 경기',
        })),
    ]
}

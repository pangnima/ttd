import type { PersonalMatch } from '@/types'
import { canRespondToProposal, isReentryTurn } from '@/lib/personal-matches/confirmation'
import { isLineupComplete, isRecruiting } from '@/lib/personal-matches/lineup'

/**
 * 경기 확인 요청 허브의 작업 큐 분류 — 순수 규칙.
 *
 * 개인 경기 결과(확정)와 확인 요청(미확정)은 `hasResult`(winner.ts) 하나로 집합 분할되고,
 * 이 모듈은 그중 **미확정 쪽만** 다시 "내 차례 / 상대 대기 / 이의 제기"로 나눈다.
 * 분류가 SQL 필터가 아니라 순수 함수라 상태 조합 전량을 테스트로 고정할 수 있다.
 *
 * 버킷 → 탭·섹션 대응 (허브 3탭 중 personal_matches 행이 있는 것들). 세 탭은 상호배타다:
 *   confirmResult       내 차례 · 결과 확인 대기   — 누군가 제안했고 내 좌석이 아직 확인하지 않았다
 *   enterResult         내 차례 · 결과 입력 대기   — 아무도 제안하지 않았다
 *   fillLineup          내 차례 · 참가자 채우기    — 모집 중이라 결과를 넣을 수 없다
 *   awaitingCounterpart 상대 대기                  — 내가 제안했거나 이미 확인했고, 남은 좌석을 기다린다
 *   reenterResult       이의 제기 · 다시 입력할 차례 — 내 제안에 이의가 들어왔다(뱃지 포함, 0061)
 *   awaitingReentry     이의 제기 · 재입력 대기      — 이의자·나머지 좌석·좌석 판정 실패 폴백
 *
 * pending 요청·룸 초대·미입력 로테이션 세션은 아직 personal_matches 행이 없어 여기서 다루지 않는다.
 */

export type MatchQueueBucket =
    | 'confirmResult'
    | 'enterResult'
    | 'fillLineup'
    | 'awaitingCounterpart'
    | 'reenterResult'
    | 'awaitingReentry'

/**
 * 미확정 개인 경기 1행 → 버킷. `hasResult(m) === false`를 전제로 한다(확정 행은 개인 경기 결과 화면 소관).
 *
 * 판정 순서가 규칙이다 — 위에서 걸리면 아래는 보지 않는다.
 *  1. 모집 중이면 결과를 넣을 수 없다(라인업이 통계 집계의 불변식)
 *  2. 자유 기록은 협상 상대가 없어 라인업만 보면 된다
 *  3. 협상 행 자체를 못 읽으면 남은 좌석을 기다린다
 *  4. 이의 상태는 좌석 여부보다 먼저 이의 탭으로 보낸다 — 그래야 "disputed 행은 이의 탭에만"이 성립한다(3탭 상호배타).
 *     차례는 제안자뿐이다(isReentryTurn)
 *  5. 좌석 판정에 실패한 관점 복사본은 남은 좌석을 기다린다
 *  6. 제안된 상태는 내 좌석이 아직 확인할 수 있느냐로 갈린다(0060 만장일치)
 *  7. 나머지(none)는 내가 제안할 차례
 */
export function classifyPendingMatch(m: PersonalMatch): MatchQueueBucket {
    if (isRecruiting(m)) return 'fillLineup'

    // 자유 기록 — 상대 확인 없이 내가 바로 확정한다
    if (!m.sourceRequestId) return isLineupComplete(m) ? 'enterResult' : 'fillLineup'

    const c = m.confirmation
    if (!c) return 'awaitingCounterpart'

    // 이의(0061) — 제안자만 다시 입력할 차례이고, 이의자·나머지 좌석·비좌석 폴백은 같은 탭에서 기다린다
    if (c.status === 'disputed') return isReentryTurn(c) ? 'reenterResult' : 'awaitingReentry'

    // 좌석 판정에 실패한 관점 복사본(참가자 미부착 등). 0059부터 좌석 넷 전원이 협상 자격을 가지므로 폴백에 가깝다.
    if (!c.viewerIsParty) return 'awaitingCounterpart'

    // 확인은 **좌석별 만장일치**다(0060) — 제안자도, 이미 확인한 좌석도 남은 좌석을 기다린다.
    if (c.status === 'proposed') return canRespondToProposal(c) ? 'confirmResult' : 'awaitingCounterpart'
    if (c.status === 'none') return 'enterResult'

    // confirmed인데 세트가 없는 조합은 존재할 수 없다(confirm이 양측 세트를 동시에 채운다) — 방어적 폴백
    return 'awaitingCounterpart'
}

/**
 * 허브 섹션·뱃지 건수.
 * participation은 personal_matches 행이 없는 단계(받은 pending 요청 + 룸 초대)라 조립 쪽에서 채운다.
 */
export type MatchQueueCounts = {
    participation: number   // 내 차례 · 경기 참여 확인
    confirmResult: number   // 내 차례 · 결과 확인 대기
    enterResult: number     // 내 차례 · 결과 입력 대기 (미입력 로테이션 세션 포함)
    fillLineup: number      // 내 차례 · 참가자 채우기
    waiting: number         // 상대 대기 (뱃지 제외)
    reenterResult: number   // 이의 제기 · 다시 입력할 차례 (뱃지 포함)
    disputeWaiting: number  // 이의 제기 · 재입력 대기 (뱃지 제외)
}

export const EMPTY_QUEUE_COUNTS: MatchQueueCounts = {
    participation: 0, confirmResult: 0, enterResult: 0, fillLineup: 0, waiting: 0, reenterResult: 0, disputeWaiting: 0,
}

/**
 * 사이드바·모바일 nav 뱃지 = '지금 내가 처리할 일' 총건수. 뱃지 정의의 단일 출처.
 * 이의 재입력(reenterResult)은 이의 탭에 있지만 내 차례이므로 포함한다 — 뱃지 = 내 차례 탭 배지 + 이의 탭 배지.
 */
export function myTurnTotal(c: MatchQueueCounts): number {
    return c.participation + c.confirmResult + c.enterResult + c.fillLineup + c.reenterResult
}

/** 이의 탭 안의 총건수(빈 상태 판정·개인 결과 화면의 미확정 합산용). 탭 배지는 reenterResult만 쓴다 */
export function disputeTotal(c: MatchQueueCounts): number {
    return c.reenterResult + c.disputeWaiting
}

// 버킷 → counts 키. awaitingCounterpart는 waiting으로, awaitingReentry는 disputeWaiting으로 접는다.
const COUNT_KEY: Record<MatchQueueBucket, keyof Omit<MatchQueueCounts, 'participation'>> = {
    confirmResult: 'confirmResult',
    enterResult: 'enterResult',
    fillLineup: 'fillLineup',
    awaitingCounterpart: 'waiting',
    reenterResult: 'reenterResult',
    awaitingReentry: 'disputeWaiting',
}

/** 버킷별 집계 — 미확정 행 목록에서 counts를 채운다(participation 제외) */
export function tallyBuckets(buckets: MatchQueueBucket[]): Omit<MatchQueueCounts, 'participation'> {
    const counts = { confirmResult: 0, enterResult: 0, fillLineup: 0, waiting: 0, reenterResult: 0, disputeWaiting: 0 }
    for (const b of buckets) counts[COUNT_KEY[b]] += 1
    return counts
}

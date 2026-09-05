import type { PersonalMatch } from '@/types'
import { isLineupComplete, isRecruiting } from '@/lib/personal-matches/lineup'

/**
 * 경기 확인 요청 허브의 작업 큐 분류 — 순수 규칙.
 *
 * 개인 경기 결과(확정)와 확인 요청(미확정)은 `hasResult`(winner.ts) 하나로 집합 분할되고,
 * 이 모듈은 그중 **미확정 쪽만** 다시 "내 차례 / 상대 대기"로 나눈다.
 * 분류가 SQL 필터가 아니라 순수 함수라 상태 조합 전량을 테스트로 고정할 수 있다.
 *
 * 버킷 → 섹션 대응 (허브 2탭 8섹션 중 personal_matches 행이 있는 것들):
 *   confirmResult       내 차례 · 결과 확인 대기   — 상대가 제안했고 내가 확인해야 한다
 *   enterResult         내 차례 · 결과 입력 대기   — 아무도 제안하지 않았거나 이의로 되돌아왔다
 *   fillLineup          내 차례 · 참가자 채우기    — 모집 중이라 결과를 넣을 수 없다
 *   awaitingCounterpart 상대 대기                  — 내가 제안했거나, 대표가 확인해야 한다
 *
 * pending 요청·룸 초대·미입력 로테이션 세션은 아직 personal_matches 행이 없어 여기서 다루지 않는다.
 */

export type MatchQueueBucket =
    | 'confirmResult'
    | 'enterResult'
    | 'fillLineup'
    | 'awaitingCounterpart'

/**
 * 미확정 개인 경기 1행 → 버킷. `hasResult(m) === false`를 전제로 한다(확정 행은 개인 경기 결과 화면 소관).
 *
 * 판정 순서가 규칙이다 — 위에서 걸리면 아래는 보지 않는다.
 *  1. 모집 중이면 결과를 넣을 수 없다(라인업이 통계 집계의 불변식)
 *  2. 자유 기록은 협상 상대가 없어 라인업만 보면 된다
 *  3. 상호 확인 경기인데 협상을 읽을 수 없으면(복식 파트너·상대2의 관점 행) 대표를 기다린다
 *  4. 제안된 상태는 제안자가 누구냐로 갈린다
 *  5. 나머지(none·disputed)는 내가 제안할 차례
 */
export function classifyPendingMatch(m: PersonalMatch): MatchQueueBucket {
    if (isRecruiting(m)) return 'fillLineup'

    // 자유 기록 — 상대 확인 없이 내가 바로 확정한다
    if (!m.sourceRequestId) return isLineupComplete(m) ? 'enterResult' : 'fillLineup'

    // 협상 행을 못 읽거나(조회 경로가 부착하지 않은 경우) 읽더라도 당사자가 아닌 관점 복사본.
    // 복식 파트너·상대2는 제안·확인·이의 3종 RPC가 전부 requester/opponent만 통과시키므로 대표를 기다린다.
    // 0052가 열람을 넓혔어도 viewerIsParty가 false로 남아 이 분기가 그대로 유지된다.
    const c = m.confirmation
    if (!c || !c.viewerIsParty) return 'awaitingCounterpart'

    if (c.status === 'proposed') return c.proposedByMe ? 'awaitingCounterpart' : 'confirmResult'
    if (c.status === 'none' || c.status === 'disputed') return 'enterResult'

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
}

export const EMPTY_QUEUE_COUNTS: MatchQueueCounts = {
    participation: 0, confirmResult: 0, enterResult: 0, fillLineup: 0, waiting: 0,
}

/** 사이드바·모바일 nav 뱃지 = '내 차례' 총건수. 뱃지 정의의 단일 출처. */
export function myTurnTotal(c: MatchQueueCounts): number {
    return c.participation + c.confirmResult + c.enterResult + c.fillLineup
}

/** 버킷별 집계 — 미확정 행 목록에서 counts의 네 항목을 채운다(participation 제외) */
export function tallyBuckets(buckets: MatchQueueBucket[]): Omit<MatchQueueCounts, 'participation'> {
    const counts = { confirmResult: 0, enterResult: 0, fillLineup: 0, waiting: 0 }
    for (const b of buckets) {
        if (b === 'awaitingCounterpart') counts.waiting += 1
        else counts[b] += 1
    }
    return counts
}

import type { PersonalMatch } from '@/types'
import { canRespondToProposal, hasDisputeHistory, isReentryTurn } from '@/lib/personal-matches/confirmation'
import { isLineupComplete, isRecruiting } from '@/lib/personal-matches/lineup'

/**
 * 경기 확인 요청 허브의 작업 큐 분류 — 순수 규칙.
 *
 * 개인 경기 결과(확정)와 확인 요청(미확정)은 `hasResult`(winner.ts) 하나로 집합 분할되고,
 * 이 모듈은 그중 **미확정 쪽만** 다시 "내 차례(승인 요청) / 상대 대기"로 나눈다.
 * 분류가 SQL 필터가 아니라 순수 함수라 상태 조합 전량을 테스트로 고정할 수 있다.
 *
 * 버킷 → 자리 대응 (personal_matches 행이 있는 것들). 한 행은 정확히 한 자리에만 나온다(tabs.ts):
 *   confirmResult          승인 요청 › 경기 결과 확정 · 결과 확인 대기 — 누군가 제안했고 내 좌석이 아직 확인하지 않았다
 *   enterResult            승인 요청 › 경기 결과 확정 · 결과 입력 대기 — 아무도 제안하지 않았다
 *   fillLineup             승인 요청 › 경기 결과 확정 · 참가자 채우기  — 모집 중이라 결과를 넣을 수 없다
 *   awaitingCounterpart    상대 승인 대기                                — 내가 제안했거나 이미 확인했고, 남은 좌석을 기다린다
 *   reenterResult          승인 요청 › 이의 신청 · 다시 입력할 차례     — 내 제안에 이의가 들어왔다(뱃지 포함, 0061)
 *   awaitingReentry        상대 승인 대기 · 재입력 대기                  — 이의자·나머지 좌석·좌석 판정 실패 폴백
 *   reentryReview          승인 요청 › 이의 신청 · 재입력된 결과 확인   — 이의 후 다시 입력됐고 내가 확인할 차례(뱃지 포함, 0062)
 *   awaitingReentryConfirm 상대 승인 대기 · 재입력 결과 확인 대기       — 내가 재입력했거나 이미 확인했다(0062)
 *
 * 이의를 거친 협상(hasDisputeHistory)은 버킷을 따로 둔다(0062) — 카드가 "누구의 이의에 대한 재입력인가"를
 * 배지로 말해야 하기 때문이다. 다만 **탭 위치는 차례 축을 따른다**(Week 38): 내 차례면 승인 요청 › 이의 신청,
 * 상대 차례면 상대 승인 대기. 0062가 세운 "확정까지 이의 탭에 머문다"는 여기서 철회됐다.
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
    | 'reentryReview'
    | 'awaitingReentryConfirm'

/**
 * 미확정 개인 경기 1행 → 버킷. `hasResult(m) === false`를 전제로 한다(확정 행은 개인 경기 결과 화면 소관).
 *
 * 판정 순서가 규칙이다 — 위에서 걸리면 아래는 보지 않는다.
 *  1. 모집 중이면 결과를 넣을 수 없다(라인업이 통계 집계의 불변식)
 *  2. 자유 기록은 협상 상대가 없어 라인업만 보면 된다
 *  3. 협상 행 자체를 못 읽으면 남은 좌석을 기다린다
 *  4. 이의 상태는 좌석 여부보다 먼저 이의 버킷으로 보낸다 — 그래야 disputed 행이 좌석 폴백에 섞이지 않는다.
 *     차례는 제안자뿐이다(isReentryTurn)
 *  5. 이의를 거친 뒤 재제안된 행도 전용 버킷에 둔다(0062). 좌석 폴백보다 **앞**이어야 좌석 판정 실패 행까지
 *     이의 맥락 배지를 단다 — 뒤에 두면 그 행만 맥락 없는 「상대 대기」 카드가 된다
 *  6. 좌석 판정에 실패한 관점 복사본은 남은 좌석을 기다린다
 *  7. 제안된 상태는 내 좌석이 아직 확인할 수 있느냐로 갈린다(0060 만장일치)
 *  8. 나머지(none)는 내가 제안할 차례
 */
export function classifyPendingMatch(m: PersonalMatch): MatchQueueBucket {
    if (isRecruiting(m)) return 'fillLineup'

    // 자유 기록 — 상대 확인 없이 내가 바로 확정한다
    if (!m.sourceRequestId) return isLineupComplete(m) ? 'enterResult' : 'fillLineup'

    const c = m.confirmation
    if (!c) return 'awaitingCounterpart'

    // 이의(0061) — 제안자만 다시 입력할 차례이고, 이의자·나머지 좌석·비좌석 폴백은 같은 탭에서 기다린다
    if (c.status === 'disputed') return isReentryTurn(c) ? 'reenterResult' : 'awaitingReentry'

    // 이의를 거친 협상은 재제안된 뒤에도 전용 버킷에 둔다(0062) — 카드가 이의 맥락을 배지로 말한다.
    // 확인이 초기화됐으므로 재입력된 값은 남은 좌석 모두의 확인 대상이고, 그 확인이 곧 이의 신청 탭의 내 차례다.
    if (hasDisputeHistory(c) && c.status === 'proposed') {
        return canRespondToProposal(c) ? 'reentryReview' : 'awaitingReentryConfirm'
    }

    // 좌석 판정에 실패한 관점 복사본(참가자 미부착 등). 0059부터 좌석 넷 전원이 협상 자격을 가지므로 폴백에 가깝다.
    if (!c.viewerIsParty) return 'awaitingCounterpart'

    // 확인은 **좌석별 만장일치**다(0060) — 제안자도, 이미 확인한 좌석도 남은 좌석을 기다린다.
    if (c.status === 'proposed') return canRespondToProposal(c) ? 'confirmResult' : 'awaitingCounterpart'
    if (c.status === 'none') return 'enterResult'

    // confirmed인데 세트가 없는 조합은 존재할 수 없다(confirm이 양측 세트를 동시에 채운다) — 방어적 폴백
    return 'awaitingCounterpart'
}

/**
 * 허브의 **'내 차례' 건수** — 알림(사이드바·모바일 뱃지)의 재료다.
 *
 * ⚠ 화면에 그려지는 **카드 수와는 다르다.** 목록 건수는 `hub-totals.ts`가 따로 파생한다 —
 * 두 숫자를 하나로 겸하게 두면 조건에 따라 "배지 0인데 카드 N장"이 생긴다(그게 0064까지의 상태였다).
 * participation은 personal_matches 행이 없는 단계(받은 pending 요청 + 룸 초대)라 조립 쪽에서 채운다.
 */
export type MatchQueueCounts = {
    participation: number   // 내 차례 · 경기 참여 확인
    confirmResult: number   // 내 차례 · 결과 확인 대기
    enterResult: number     // 내 차례 · 결과 입력 대기 (**미입력** 로테이션 세션만)
    fillLineup: number      // 내 차례 · 참가자 채우기
    waiting: number         // 상대 대기 (뱃지 제외)
    reenterResult: number   // 이의 신청 · 다시 입력할 차례 (뱃지 포함)
    disputeWaiting: number  // 상대 대기 · 재입력 대기 (뱃지 제외)
    reentryReview: number   // 이의 신청 · 재입력된 결과 확인 (뱃지 포함, 0062)
    reentryWaiting: number  // 상대 대기 · 재입력 결과 확인 대기 (뱃지 제외, 0062)
    /**
     * 이미 게임이 등록된 로테이션 세션 수 — **카드는 보이지만 내 차례가 아니다**.
     * 방 세션은 finalize 후에도 남고(0050) 좌석 있는 방 밖 세션도 남으므로(0057), 이것을 내 차례로
     * 세면 영영 안 사라지는 뱃지가 된다. 그래서 뱃지에서는 빼고 **목록 건수에만** 더한다.
     * 이 값이 없던 동안 그 차이는 이름 없는 오프셋이었고, 「결과 입력 대기」 섹션의 헤더 수가
     * 카드 수보다 작아지다가 0이 되면 QueueSection의 0-게이트가 카드까지 삼켰다.
     */
    enteredSessions: number
}

export const EMPTY_QUEUE_COUNTS: MatchQueueCounts = {
    participation: 0, confirmResult: 0, enterResult: 0, fillLineup: 0, waiting: 0,
    reenterResult: 0, disputeWaiting: 0, reentryReview: 0, reentryWaiting: 0,
    enteredSessions: 0,
}

/** 「승인 요청 › 초대」의 내 차례 — 참여 수락(받은 요청·일정 초대·방 초대) */
export function inviteMyTurn(c: MatchQueueCounts): number {
    return c.participation
}

/**
 * 「승인 요청 › 경기 결과 확정」의 내 차례 — 결과가 내 손을 기다리는 것들.
 * 제안된 결과 확인(승인)과 결과 입력·참가자 채우기(내가 값을 만드는 일)를 한 탭에 두되, 악센트는
 * 승인 쪽 섹션에만 준다. fillLineup이 여기 있는 이유는 라인업이 차야 결과를 넣을 수 있어서다.
 */
export function resultMyTurn(c: MatchQueueCounts): number {
    return c.confirmResult + c.enterResult + c.fillLineup
}

/** 「승인 요청 › 이의 신청」의 내 차례 — 다시 입력할 차례 + 재입력된 결과 확인. 이 탭은 카드 수 = 내 차례다 */
export function disputeMyTurnTotal(c: MatchQueueCounts): number {
    return c.reenterResult + c.reentryReview
}

/**
 * 사이드바·모바일 nav 뱃지 = '지금 내가 처리할 일' 총건수. **알림**의 단일 출처다.
 *
 * 승인 요청 탭의 하위 세 탭(초대·경기 결과 확정·이의 신청)의 내 차례를 더한 값이고, 곧 **승인 요청 탭의
 * 내 차례 총합**이다(hub-totals.ts hubTopHasMyTurn과 같은 재료). 상대 승인 대기는 정의상 0이다.
 * 뺄셈으로 정의하지 않는다 — 항이 늘 때마다 뺄셈을 쓰는 곳이 함께 깨진 전력이 있다(0062의 백지 화면).
 * **값 자체는 탭 구조가 바뀌어도 변하지 않는다**(4탭 → 2단 탭, Week 38).
 */
export function myTurnTotal(c: MatchQueueCounts): number {
    return inviteMyTurn(c) + resultMyTurn(c) + disputeMyTurnTotal(c)
}

/** 버킷 집계가 채우는 키 — participation·enteredSessions는 조립 쪽에서 온다 */
type TalliedCounts = Omit<MatchQueueCounts, 'participation' | 'enteredSessions'>

// 버킷 → counts 키. awaitingCounterpart는 waiting으로, awaitingReentry는 disputeWaiting으로 접는다.
const COUNT_KEY: Record<MatchQueueBucket, keyof TalliedCounts> = {
    confirmResult: 'confirmResult',
    enterResult: 'enterResult',
    fillLineup: 'fillLineup',
    awaitingCounterpart: 'waiting',
    reenterResult: 'reenterResult',
    awaitingReentry: 'disputeWaiting',
    reentryReview: 'reentryReview',
    awaitingReentryConfirm: 'reentryWaiting',
}

/** 버킷별 집계 — 미확정 행 목록에서 counts를 채운다(participation·enteredSessions 제외) */
export function tallyBuckets(buckets: MatchQueueBucket[]): TalliedCounts {
    const counts = {
        confirmResult: 0, enterResult: 0, fillLineup: 0, waiting: 0,
        reenterResult: 0, disputeWaiting: 0, reentryReview: 0, reentryWaiting: 0,
    }
    for (const b of buckets) counts[COUNT_KEY[b]] += 1
    return counts
}

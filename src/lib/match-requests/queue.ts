import type { PersonalMatch } from '@/types'
import { canRespondToProposal, hasDisputeHistory, isReentryTurn } from '@/lib/personal-matches/confirmation'
import { isLineupComplete, isRecruiting } from '@/lib/personal-matches/lineup'

/**
 * 미확정 경기의 작업 큐 분류 — 순수 규칙.
 *
 * 개인 경기 결과(확정)와 미확정은 `hasResult`(winner.ts) 하나로 집합 분할되고,
 * 이 모듈은 그중 **미확정 쪽만** 다시 "내 차례 / 상대 대기"로 나눈다.
 * 분류가 SQL 필터가 아니라 순수 함수라 상태 조합 전량을 테스트로 고정할 수 있다.
 *
 * 버킷 → 자리 대응. 한 행은 정확히 한 자리에만 나온다 — 경계는 **room_id**다(Week 39):
 * 방에 속한 행은 매칭 룸(과 매칭 리스트의 내 차례 필)이, 방 밖 행은 개인 경기 결과가 그린다.
 *   confirmResult          결과 확인 대기        — 누군가 제안했고 내 좌석이 아직 확인하지 않았다
 *   enterResult            결과 입력 대기        — 아무도 제안하지 않았다
 *   fillLineup             참가자 채우기         — 모집 중이라 결과를 넣을 수 없다
 *   awaitingCounterpart    상대 대기             — 내가 제안했거나 이미 확인했고, 남은 좌석을 기다린다
 *   reenterResult          다시 입력할 차례      — 내 제안에 이의가 들어왔다(0061)
 *   awaitingReentry        재입력 대기           — 이의자·나머지 좌석·좌석 판정 실패 폴백
 *   reentryReview          재입력된 결과 확인    — 이의 후 다시 입력됐고 내가 확인할 차례(0062)
 *   awaitingReentryConfirm 재입력 결과 확인 대기 — 내가 재입력했거나 이미 확인했다(0062)
 *
 * 이의를 거친 협상(hasDisputeHistory)은 버킷을 따로 둔다(0062) — 카드가 "누구의 이의에 대한 재입력인가"를
 * 배지로 말해야 하기 때문이다.
 *
 * 룸 초대와 미입력 로테이션 세션은 아직 personal_matches 행이 없어 여기서 다루지 않는다.
 * 방 단위 롤업은 `lib/match-rooms/room-turn.ts`가 이 버킷을 받아 수행한다.
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

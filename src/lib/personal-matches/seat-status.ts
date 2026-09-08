import type { PersonalMatchConfirmation } from '@/types'
import type { NamedSeat } from '@/lib/personal-matches/confirmation'

/**
 * 결과 확인 축의 **좌석별 상태** — "누가 확인했고 누가 아직인가"를 이름으로 말하는 단일 출처.
 *
 * 0060이 확인을 좌석별 만장일치로 바꾸면서 `confirmed_by`(user_id 배열)가 생겼지만, 화면은 줄곧
 * `2/4명 확인`이라는 숫자만 보여 줬다 — 남은 한 명이 누구인지 알 수 없으니 재촉할 대상도 알 수 없었다.
 * 이 모듈은 그 배열을 좌석 이름과 대조한다.
 *
 * 참여 축의 형제는 `lib/match-requests/participants.ts`(요청 수락)와
 * `lib/personal-matches/rotation-participation.ts`(세션 일정 수락)다. 셋 다 같은 문구 형식을 쓴다.
 */

export type SeatState =
    | 'proposer'   // 이 결과를 입력한 사람 — 제안이 곧 확인이다(0060)
    | 'confirmed'  // 확인했다
    | 'pending'    // 아직 확인하지 않았다 (재촉 대상)
    | 'guest'      // 비회원 — 확인 절차가 없다. 항상 동의한 것으로 본다
    | 'left'       // 탈퇴한 회원 — 분모에서 빠졌다. 기다려도 오지 않는다

export type SeatStatus = { name: string; state: SeatState }

const STATE_LABEL: Record<SeatState, string> = {
    proposer: '결과를 입력한 사람',
    confirmed: '확인 완료',
    pending: '확인 대기',
    guest: '자동 동의',
    left: '탈퇴',
}

export function seatStateLabel(state: SeatState): string {
    return STATE_LABEL[state]
}

/**
 * 좌석 하나의 상태. 판정 순서가 규칙이다 — 위에서 걸리면 아래는 보지 않는다.
 *  1. user_id가 없으면 비회원 — 확인 절차 자체가 없다(규칙: 게스트는 항상 동의)
 *  2. 탈퇴자는 분모에서 빠졌으므로 'pending'으로 그리면 안 된다(오지 않을 확인을 기다리는 것처럼 보인다)
 *  3. 제안자는 confirmed_by에도 들어 있지만 따로 표시한다 — 누가 이 스코어를 넣었는지가 정보다
 */
function stateOf(c: PersonalMatchConfirmation, userId: string | undefined): SeatState {
    if (!userId) return 'guest'
    if (c.inactiveUserIds.includes(userId)) return 'left'
    if (c.proposedBy === userId) return 'proposer'
    return c.confirmedUserIds.includes(userId) ? 'confirmed' : 'pending'
}

/**
 * 뷰어 관점 경기 1건 → 좌석 명단. 뷰어가 좌석을 가졌다면 첫 항목이 '나'다.
 *
 * `seats`는 관점 행의 참가자 스냅샷(labels.ts `namedSeatsOf` — 파트너·상대1·상대2)이고, 뷰어 자신은
 * 그 목록에 없으므로 여기서 앞에 붙인다. 단식이면 상대 1명뿐이라 두 항목이 된다.
 *
 * 뷰어의 상태에 `viewerId`가 필요 없는 것은 `proposedByMe`·`confirmedByMe`가 이미 그 답이기 때문이다.
 * 좌석이 없는 관점 행(참가자 미부착 폴백)에서는 '나'를 넣지 않는다 — 확인 대상이 아닌 사람을
 * '확인 대기'로 그리면 오지 않을 응답을 기다리는 것처럼 보인다.
 * 이름이 빈 슬롯(모집 중이거나 스냅샷이 부실한 경우)도 뺀다 — 이름 없는 '확인 대기'는 정보가 아니다.
 */
export function confirmSeatStatuses(c: PersonalMatchConfirmation, seats: NamedSeat[]): SeatStatus[] {
    const others = seats
        .map((s) => ({ name: s.name.trim(), state: stateOf(c, s.userId) }))
        .filter((s) => s.name.length > 0)
    if (!c.viewerIsParty) return others

    const me: SeatState = c.proposedByMe ? 'proposer' : c.confirmedByMe ? 'confirmed' : 'pending'
    return [{ name: '나', state: me }, ...others]
}

/** 상태별 이름 묶음 — '확인 완료: 나 · A / 확인 대기: B' 한 줄을 만드는 재료 */
export function groupSeatNames(statuses: SeatStatus[]): Array<{ state: SeatState; names: string[] }> {
    const order: SeatState[] = ['proposer', 'confirmed', 'pending', 'guest', 'left']
    return order
        .map((state) => ({ state, names: statuses.filter((s) => s.state === state).map((s) => s.name) }))
        .filter((g) => g.names.length > 0)
}

/**
 * 명단을 렌더할 만한 상태인가 — 협상이 진행 중(proposed)이어야 '누가 확인했는가'가 의미를 갖는다.
 * 숫자 배지(formatConfirmProgress)는 단식에서 스스로 숨지만 명단은 단식에서도 쓸모가 있다
 * ('OOO님 확인 대기'는 한 명이어도 정보다).
 */
export function shouldShowSeatStatuses(c?: PersonalMatchConfirmation): boolean {
    return c?.status === 'proposed'
}

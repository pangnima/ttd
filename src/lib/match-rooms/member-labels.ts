/**
 * 매칭 참가자 명단·목록 카드에 찍히는 상태 라벨 — **단일 출처**.
 *
 * 이 문자열들은 표시값이면서 동시에 로직 값이다. `MemberRowView.statusLabel`이
 * 정렬 맵(members-view의 ORDER)과 배지 색 맵(RoomMemberRow의 STATUS_CLASS)의 **키**이고,
 * 내보내기 자격(kick.ts)도 이 값을 비교한다. 두 맵 모두 `Record<string, …>`이라
 * 라벨만 고치고 키를 놓치면 **타입 에러 없이** 정렬 순서와 배지 색이 조용히 깨진다.
 * 그래서 라벨을 상수로 두고 맵은 계산 키(`[HOST_LABEL]: 0`)로 쓴다.
 *
 * 호칭은 '호스트'다 — 코드 식별자(`role: 'host'`·`isHost`)와 DB 값, RPC 에러 키(`not_host`)는
 * 그대로 두고 **노출 문구만** 바꿨다(Week 54).
 *
 * 후속: `statusLabel`을 이 상수들의 유니언으로 좁히는 것. 지금은 guestRows의 기본 인자와
 * ORDER의 `?? 9` 폴백이 string을 전제해 미룬다.
 */

export const HOST_LABEL = '호스트'
export const JOINED_LABEL = '참가'

/**
 * 초대받았지만 아직 답하지 않은 상태(`status='invited'`).
 * 목록 카드가 '초대됨', 명단이 '초대 대기'로 갈려 있던 것을 '초대 대기'로 합쳤다 —
 * '확인 대기'와 같은 "대기" 계열이라 한 화면에서 나란히 놓여도 읽는 규칙이 하나다.
 */
export const INVITED_LABEL = '초대 대기'

/**
 * 호스트가 내보낸 상태(`status='removed'`). 내보내진 당사자가 자기 목록 카드에서 본다 —
 * 카드가 '참가'라고 말하면 왜 아무것도 못 하는지 알 수 없다.
 * 액션이 [내보내기]이고 안내가 '내보냈습니다'라 어간을 맞췄다(옛 '강퇴됨').
 */
export const REMOVED_LABEL = '내보내짐'

/**
 * 스스로 나갔거나 초대를 거절한 상태(`status='declined'`). 명단에는 행이 없고 [회원 초대] 검색 결과에서만
 * 보인다 — 호스트에게는 다시 부를 수 있는 사람이고 참가자에게는 부를 수 없는 사람이라, 왜 못 고르는지를
 * 라벨이 말해야 한다. 액션 [매칭 나가기]와 어간을 맞췄다.
 */
export const DECLINED_LABEL = '나감'

/** 수락 전 대표 확인자 — 아직 멤버가 아니라 요청의 상대다 */
export const PENDING_CONFIRM_LABEL = '확인 대기'

/** 계정 없는 참가자 — 매칭 안에서는 이름이 곧 정체성이다 */
export const GUEST_LABEL = '비회원'

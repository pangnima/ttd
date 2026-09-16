import type { ErrorMapEntry } from '@/lib/match-rooms/error-map'

/**
 * 룸·결과 협상 RPC의 raise 키 → 사용자 문구 — 액션 파일('use server')에서 여기로 뺐다(F-pre-5·6).
 * 순수 모듈이어야 `error-messages.test.ts`가 **실제 맵**을 두고 "RPC가 raise하는 키가 전부 있는가"를 볼 수 있다.
 * 문구를 고를 때는 `findKnownError`가 포함된 키 중 가장 긴 것을 고르므로 순서는 무관하다(F-pre-2).
 */

/** RPC가 raise하는 식별자 → 사용자 안내 문구. 순서 무관 — translateError가 포함된 키 중 가장 긴 것을 고른다(F-pre-2) */
export const ROOM_ERROR_MESSAGES: ReadonlyArray<ErrorMapEntry> = [
    ['not_authenticated', '로그인이 필요합니다.'],
    ['room_not_found', '존재하지 않거나 리스트에서 내려간 경기입니다.'],
    // 0082 — 비노출 방은 비밀번호 입장도, 비밀번호 만들기도 없다(초대로만 들어온다)
    ['room_not_listed', '초대받은 사람만 들어올 수 있는 매칭입니다. 비밀번호 입장은 지원하지 않습니다.'],
    ['wrong_password', '비밀번호가 일치하지 않습니다.'],
    ['invalid_password', '비밀번호는 4~20자, 공백 없이 입력해주세요.'],
    ['invite_not_found', '처리할 초대가 없습니다.'],
    ['target_not_room_member', '이미 매칭에 없는 참가자입니다.'],
    ['cannot_kick_host', '호스트는 내보낼 수 없습니다.'],
    // 0077 — leave의 키가 kick의 키(member_has_games)를 부분 문자열로 품는다(긴 키 우선이라 순서는 무관)
    ['leave_member_has_games', '이미 배정된 경기가 있어 나갈 수 없습니다. 결과를 마무리하거나 호스트에게 대진 수정을 요청해주세요.'],
    ['member_has_games', '이미 배정된 경기가 있어 내보낼 수 없습니다.'],
    ['room_member_removed', '호스트가 내보낸 경기입니다. 다시 초대를 받아야 입장할 수 있습니다.'],
    ['not_host', '호스트만 할 수 있습니다.'],
    ['not_room_host', '호스트만 할 수 있습니다.'],
    ['invalid_guest_name', '이름을 1~40자로 입력해주세요.'],
    ['duplicate_guest_name', '이미 같은 이름의 참가자가 있습니다. 구별되는 이름으로 입력해주세요.'],
    ['guest_not_found', '이미 명단에서 빠진 참가자입니다.'],
    ['room_already_closed', '이미 게임 입력이 종료된 경기입니다.'],
    // 0083 — 호스트가 닫은 방. 기존 room_already_closed(정산됨)와 뜻이 다르다
    ['room_closed', '호스트가 마감한 매칭입니다. 고치려면 호스트가 다시 열어야 합니다.'],
    ['room_not_settled', '모든 게임의 결과가 확정된 뒤에 마감할 수 있습니다.'],
    ['room_not_closed', '마감되지 않은 매칭입니다.'],
    ['not_room_member', '매칭에 참가한 뒤 게임을 등록할 수 있습니다.'],
    // 상세 RPC(0070)가 참가자 아닌 사람에게 raise — 화면은 게이트를 먼저 그리므로 우회 호출에서만(F-pre-6)
    ['not_member', '매칭에 참가한 사람만 볼 수 있습니다.'],
    ['host_cannot_leave', '호스트는 나갈 수 없습니다. 매칭 리스트에서 내리기를 사용해주세요.'],
    ['room_not_ready', '아직 게임을 추가할 수 없는 경기입니다.'],
    ['cannot_request_self', '자기 자신과의 게임은 등록할 수 없습니다.'],
    ['invalid_opponent', '게임 상대를 다시 선택해주세요.'],
    ['opponent_not_in_room', '상대는 이 매칭에 참가한 회원이어야 합니다.'],
    ['participant_not_in_room', '참가자는 이 매칭에 참가한 회원이어야 합니다.'],
    ['doubles_players_required', '복식은 파트너와 상대팀 2번째 선수를 모두 입력해주세요.'],
    ['duplicate_players', '같은 회원을 두 번 지정할 수 없습니다.'],
    ['invalid_partner', '파트너를 다시 선택해주세요.'],
    ['invalid_opponent2', '상대팀 2번째 선수를 다시 선택해주세요.'],
    ['replace_not_allowed', '이미 결과가 있거나 내 기록이 아니어서 대체할 수 없습니다.'],
    ['invalid_participant', '참가자 정보를 다시 확인해주세요.'],
    ['invalid_games', '대진 구성이 올바르지 않습니다. 게임마다 회원이 한 명은 있어야 합니다.'],
    // create_match_room(0073)·create_room_lineup(0078)의 값 범위 — 화면 선검증이 있어 우회 호출에서만(F-pre-6)
    ['invalid_duration', '경기 시간을 다시 선택해주세요.'],
    ['invalid_court_count', '코트 면 수를 다시 선택해주세요.'],
    ['invalid_slot_minutes', '경기당 시간은 10~180분 사이여야 합니다.'],
    ['lineup_locked', '그 사이 결과가 입력된 경기가 있어 대진을 바꿀 수 없습니다. 새로고침 후 다시 시도해주세요.'],
]

/**
 * RPC가 raise하는 식별자 → 사용자 안내 문구 (acceptMatchRequestAction과 동일 패턴).
 * 한 키가 다른 키의 접두(`result_already_confirmed` ⊂ `…_by_seat`)여도 findKnownError가 가장 긴 키를 고르므로
 * 순서는 무관하다(F-pre-2 — 종전의 길이순 정렬을 공용 함수로 옮겼다).
 */
export const RESULT_ERROR_MESSAGES: ReadonlyArray<ErrorMapEntry> = [
    ['request_not_found', '존재하지 않는 경기입니다.'],
    ['request_not_accepted', '수락된 상호 확인 경기에만 결과를 등록할 수 있습니다.'],
    ['not_request_party', '이 경기에 참가한 회원만 결과를 등록할 수 있습니다.'],
    ['negotiation_not_found', '결과 협상 정보를 찾을 수 없습니다. 화면을 새로고침해주세요.'],
    ['result_already_confirmed', '이미 확정된 결과입니다.'],
    ['result_already_proposed', '다른 참가자가 먼저 결과를 제안했습니다. 제안된 결과를 확인해주세요.'],
    ['result_not_proposed', '확인할 결과 제안이 없습니다. 다른 참가자가 이의를 제기했거나 다시 입력했을 수 있습니다.'],
    ['cannot_confirm_own_proposal', '본인이 제안한 결과는 이미 확인한 것으로 칩니다. 남은 참가자의 확인을 기다려주세요.'],
    ['result_already_confirmed_by_seat', '이미 확인한 결과입니다. 남은 참가자의 확인을 기다려주세요.'],
    ['cannot_dispute_own_proposal', '본인이 제안한 결과에는 이의를 제기할 수 없습니다. 제안을 수정해주세요.'],
    ['counterpart_deleted', '상대팀 회원이 모두 탈퇴하여 결과를 확정할 수 없습니다.'],
    ['invalid_set_scores', '게임 스코어를 올바르게 입력해주세요.'],
    ['dispute_reason_too_long', '이의 사유는 200자 이내로 입력해주세요.'],
    ['personal_matches_missing', '경기 기록을 찾을 수 없어 확정하지 못했습니다.'],
    ['perspective_row_missing', '참가자 기록 일부가 없어 확정하지 못했습니다.'],
    ['result_not_confirmed', '아직 확정되지 않은 결과입니다.'],
    // 0083 — 닫힌 방의 정정. 화면은 버튼을 감추므로 우회 호출에서만(F-pre-5). 룸 맵과 같은 문구
    ['room_closed', '호스트가 마감한 매칭입니다. 고치려면 호스트가 다시 열어야 합니다.'],
]

/** 내 화면이 낡아서 거부된 코드들 — 동시 입력의 다른 한쪽이 먼저 도착했을 때 */
export const STALE_KEYS: ReadonlySet<string> = new Set([
    'result_already_proposed', 'result_not_proposed', 'result_already_confirmed',
    'result_already_confirmed_by_seat', 'negotiation_not_found',
])

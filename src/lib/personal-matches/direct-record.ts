/**
 * 「직접 기록」의 경계 (순수 — Week 39).
 *
 * 회원이 한 명이라도 끼는 경기는 **반드시 매칭(방)을 거친다**. 상대에게도 남는 기록이므로
 * 동의와 결과 확인이 필요하고, 그 절차는 전부 매칭 룸 안에 있다.
 * 방 없는 직접 기록은 비회원(게스트)끼리 친 경기 — 확인받을 상대가 없어 내 기록에만 남는다.
 *
 * 이 술어가 앱쪽 경계다. DB에는 대응 가드가 없다(방 밖 요청 RPC는 안전망으로 남겨 둔다) —
 * 그래서 폼 검증과 서버 액션 **양쪽**이 이 함수를 봐야 한다. 한쪽만 보면 그쪽이 곧 우회로가 된다.
 */
export type DirectRecordPlayer = { userId?: string }

/** 회원이 한 명이라도 있으면 true — 그 경기는 매칭 룸에서 기록해야 한다 */
export function requiresRoom(players: ReadonlyArray<DirectRecordPlayer>): boolean {
    return players.some((p) => !!p.userId)
}

export const DIRECT_RECORD_MEMBER_ERROR =
    '회원과 함께 친 경기는 매칭을 만들어 기록합니다. 상대를 비회원으로 두거나 매칭 만들기를 이용해주세요.'

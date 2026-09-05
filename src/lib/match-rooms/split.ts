/**
 * 매칭 리스트의 '오늘' 기준점.
 *
 * 진행/종료 분리 자체는 서버 필터로 옮겼다(`queries/match-rooms.ts`의 `applyRoomFilter`) —
 * 목록을 전부 받아 메모리에서 나누던 구 `splitRooms`는 페이지네이션과 양립하지 않는다.
 * 경계 날짜만 여기서 만들어 쿼리에 넘긴다.
 */

/** 오늘 날짜 'YYYY-MM-DD' (Asia/Seoul). sv-SE 로케일이 ISO 형식을 그대로 낸다. */
export function todayIsoKst(now: Date = new Date()): string {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(now)
}

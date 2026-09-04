/**
 * 경기 리스트 예정/지난 분리.
 * 지난 경기 = 결과가 확정된 방(isSettled) 또는 날짜가 지난 방(0049).
 * 확정은 날짜보다 앞선다 — 오늘 잡힌 경기라도 모든 게임 결과가 확정되면 지난 경기로 내려간다.
 */
export type SplittableRoom = { playedAt: string; playedTime?: string; isSettled: boolean }

/** 오늘 날짜 'YYYY-MM-DD' (Asia/Seoul). sv-SE 로케일이 ISO 형식을 그대로 낸다. */
export function todayIsoKst(now: Date = new Date()): string {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(now)
}

function sortKey(r: SplittableRoom): string {
    return `${r.playedAt} ${r.playedTime ?? ''}`
}

export function splitRooms<T extends SplittableRoom>(rooms: T[], todayIso: string): { upcoming: T[]; past: T[] } {
    const isPast = (r: T) => r.isSettled || r.playedAt < todayIso
    const upcoming = rooms.filter((r) => !isPast(r)).sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
    const past = rooms.filter(isPast).sort((a, b) => sortKey(b).localeCompare(sortKey(a)))
    return { upcoming, past }
}

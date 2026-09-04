/**
 * 경기 리스트 목록 분리 — 예정(오늘 이후, 가까운 순) / 지난 경기(최근순).
 * '오늘'은 서버가 UTC라도 한국 기준으로 판정한다(todayIsoKst).
 */
export type DatedRoom = { playedAt: string; playedTime?: string }

/** 오늘 날짜 'YYYY-MM-DD' (Asia/Seoul). sv-SE 로케일이 ISO 형식을 그대로 낸다. */
export function todayIsoKst(now: Date = new Date()): string {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(now)
}

function sortKey(r: DatedRoom): string {
    return `${r.playedAt} ${r.playedTime ?? ''}`
}

export function splitRoomsByDate<T extends DatedRoom>(rooms: T[], todayIso: string): { upcoming: T[]; past: T[] } {
    const upcoming = rooms.filter((r) => r.playedAt >= todayIso).sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
    const past = rooms.filter((r) => r.playedAt < todayIso).sort((a, b) => sortKey(b).localeCompare(sortKey(a)))
    return { upcoming, past }
}

import type { Match, User } from '@/types'
import { sortByGender } from '@/lib/match-games/form-mapping'

// 정규화된 Match에서 참가 선수 id 추출.
// form-mapping의 entryPlayerIds(SimpleMatchEntry용)와 대응되는 Match용 버전.
export function matchPlayerIds(m: Match): string[] {
    if (m.matchType === 'singles') {
        return [m.player1Id, m.player2Id].filter((id): id is string => Boolean(id))
    }
    return [...(m.team1 ?? []), ...(m.team2 ?? [])].filter(Boolean)
}

// 시간대별 휴식 인원 계산.
// slots: 시간대 키 → 그 시간대에 경기를 뛰는 선수 id 목록
// attendeeIds: 전체 참석자 id (상세=모든 매치 선수 합집합, 폼=attendeeIds 상태)
// 반환: 시간대 키 → 휴식 선수 id 목록 (그 시간대에 어느 경기에도 배정되지 않은 참석자)
export function restingIdsBySlot(
    slots: Array<{ key: string; playerIds: string[] }>,
    attendeeIds: string[]
): Map<string, string[]> {
    const result = new Map<string, string[]>()
    for (const slot of slots) {
        const playing = new Set(slot.playerIds)
        result.set(slot.key, attendeeIds.filter((id) => !playing.has(id)))
    }
    return result
}

// 선수별 게임 수 집계. playerIdGroups는 경기별 참가 선수 id 목록의 배열.
// 반환: 게임수 내림차순, 동률이면 성별(남→여)·가나다순(sortByGender)으로 정렬된 배열.
// players에 없는 id(매핑 실패)는 제외한다.
export function gameCountsByPlayer(
    playerIdGroups: string[][],
    players: User[]
): Array<{ player: User; count: number }> {
    const counts = new Map<string, number>()
    for (const ids of playerIdGroups) {
        for (const id of ids) {
            counts.set(id, (counts.get(id) ?? 0) + 1)
        }
    }

    const playerMap = new Map(players.map((p) => [p.id, p]))
    const rows = [...counts.entries()]
        .map(([id, count]) => ({ player: playerMap.get(id), count }))
        .filter((r): r is { player: User; count: number } => Boolean(r.player))

    // 동률 정렬을 위해 player 기준 sortByGender 순서를 인덱스로 활용
    const order = new Map(sortByGender(rows.map((r) => r.player)).map((p, i) => [p.id, i]))
    return rows.sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count
        return (order.get(a.player.id) ?? 0) - (order.get(b.player.id) ?? 0)
    })
}

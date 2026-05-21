import type { Court, Match, MatchGame, MatchType, Round, TimeSlot, User } from '@/types'

export type SimpleMatchEntry = {
    id: string
    courtLabel: string
    startAt: string
    endAt: string
    matchType: MatchType
    player1Id: string
    player2Id: string
    team1: [string, string]
    team2: [string, string]
    prevMatchId?: string
}

export const genId = (prefix: string) =>
    `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

export function filterCandidates(players: User[], matchType: MatchType): User[] {
    if (matchType === 'men_doubles') return players.filter((u) => u.gender === 'male')
    if (matchType === 'women_doubles') return players.filter((u) => u.gender === 'female')
    return players
}

export function entryPlayerIds(e: SimpleMatchEntry): string[] {
    if (e.matchType === 'singles') return [e.player1Id, e.player2Id].filter(Boolean)
    return [...e.team1, ...e.team2].filter(Boolean)
}

// 편집 진입 시 정규화된 MatchGame → 평면 SimpleMatchEntry[] 역매핑.
// DB에는 courtId/timeSlotId(UUID)만 저장되므로, 폼 입력값(label/시각 문자열)을
// 복원하려면 courts/rounds 배열을 역참조해야 한다.
export function matchGameToEntries(matchGame: MatchGame): SimpleMatchEntry[] {
    return matchGame.matches.map((m) => {
        const court = matchGame.courts.find((c) => c.id === m.courtId)
        let startAt = ''
        let endAt = ''
        for (const round of matchGame.rounds) {
            const ts = round.timeSlots.find((t) => t.id === m.timeSlotId)
            if (ts) { startAt = ts.startAt; endAt = ts.endAt; break }
        }
        return {
            id: m.id,
            courtLabel: court?.label ?? '',
            startAt,
            endAt,
            matchType: m.matchType,
            player1Id: m.player1Id ?? '',
            player2Id: m.player2Id ?? '',
            team1: (m.team1 ?? ['', '']) as [string, string],
            team2: (m.team2 ?? ['', '']) as [string, string],
            prevMatchId: m.id,
        }
    })
}

// 폼 제출 전 유효성 검사. 오류가 없으면 null 반환.
export function validateEntries(entries: SimpleMatchEntry[], allPlayers: User[]): string | null {
    if (entries.length === 0) return '게임을 1개 이상 추가해주세요.'

    for (const e of entries) {
        if (!e.courtLabel.trim()) return '모든 게임의 코트를 입력해주세요.'
        if (!e.startAt || !e.endAt) return '모든 게임의 시간을 입력해주세요.'
        if (e.matchType === 'singles') {
            if (!e.player1Id || !e.player2Id) return '모든 게임의 선수를 선택해주세요.'
        } else {
            if (!e.team1[0] || !e.team2[0]) return '모든 게임의 선수를 선택해주세요.'
        }
        const ids = entryPlayerIds(e)
        if (new Set(ids).size !== ids.length) return '한 경기에 같은 선수를 중복 배정할 수 없습니다.'
    }

    // 같은 시간대 내 중복 출전 검사 — 다른 시간대 중복은 허용.
    const nameOf = (id: string) => allPlayers.find((p) => p.id === id)?.nickname ?? '선수'
    const slotSeen = new Map<string, Set<string>>()
    for (const e of entries) {
        const key = `${e.startAt}|${e.endAt}`
        const seen = slotSeen.get(key) ?? new Set<string>()
        for (const pid of entryPlayerIds(e)) {
            if (seen.has(pid)) {
                return `같은 시간대(${e.startAt}~${e.endAt})에 ${nameOf(pid)} 선수가 중복 배정되었습니다.`
            }
            seen.add(pid)
        }
        slotSeen.set(key, seen)
    }

    return null
}

type MatchGamePayload = { courts: Court[]; rounds: Round[]; matches: Match[] }

// 평면 SimpleMatchEntry[] → 정규화된 courts / rounds / matches 3계층으로 변환.
// 코트: 동일 label이면 하나의 Court row. 타임슬롯: "startAt|endAt" 복합 키로 중복 판단.
// 현재 폼은 단일 라운드("1st")만 지원.
export function buildMatchGamePayload(entries: SimpleMatchEntry[]): MatchGamePayload {
    const uniqueCourtLabels = [...new Set(entries.map((e) => e.courtLabel.trim()))]
    const courts: Court[] = uniqueCourtLabels.map((label, i) => ({
        id: genId('court'),
        label,
        order: i + 1,
    }))

    const slotMap = new Map<string, TimeSlot>()
    for (const e of entries) {
        const key = `${e.startAt}|${e.endAt}`
        if (!slotMap.has(key)) {
            slotMap.set(key, { id: genId('ts'), startAt: e.startAt, endAt: e.endAt })
        }
    }
    const round: Round = { id: genId('round'), label: '1st', order: 1, timeSlots: [...slotMap.values()] }

    const matches: Match[] = entries.map((e, i) => {
        const court = courts.find((c) => c.label === e.courtLabel.trim())!
        const slot = slotMap.get(`${e.startAt}|${e.endAt}`)!
        return {
            id: genId(`m${i}`),
            matchGameId: '',
            roundId: round.id,
            courtId: court.id,
            timeSlotId: slot.id,
            matchType: e.matchType,
            ...(e.matchType === 'singles'
                ? { player1Id: e.player1Id, player2Id: e.player2Id }
                : { team1: e.team1.filter(Boolean), team2: e.team2.filter(Boolean) }),
            status: 'scheduled',
            prevMatchId: e.prevMatchId,
        }
    })

    return { courts, rounds: [round], matches }
}

import type { Court, CourtSurface, Match, MatchGame, MatchType, Round, TimeSlot, User } from '@/types'

/** 폼에서 관리하는 코트 목록 아이템. surface ''는 미지정. */
export type FormCourt = {
    id: string
    label: string
    surface: CourtSurface | ''
}

/** 게임 목록의 개별 행. courtId로 FormCourt를 참조한다. */
export type SimpleMatchEntry = {
    id: string
    courtId: string     // FormCourt.id 참조 (표시에는 court.label 사용)
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

/** "HH:MM" 문자열에 분을 더해 "HH:MM"로 반환. 24시를 넘으면 wrap(방어). */
export function addMinutes(time: string, minutes: number): string {
    const [h, m] = time.split(':').map(Number)
    if (Number.isNaN(h) || Number.isNaN(m)) return time   // 비정상 입력은 그대로 반환
    const total = ((h * 60 + m + minutes) % 1440 + 1440) % 1440
    const hh = Math.floor(total / 60)
    const mm = total % 60
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

export function filterCandidates(players: User[], matchType: MatchType): User[] {
    if (matchType === 'men_doubles') return players.filter((u) => u.gender === 'male')
    if (matchType === 'women_doubles') return players.filter((u) => u.gender === 'female')
    return players
}

// 남성(male) → 여성(female) 순으로 정렬. 같은 성별 내에서는 nickname 가나다순.
// 참석자 칩 표시와 게임 행 후보 드롭다운 양쪽에서 공용으로 사용.
export function sortByGender(users: User[]): User[] {
    const genderRank = (g: User['gender']) => (g === 'male' ? 0 : 1)
    return [...users].sort((a, b) => {
        const diff = genderRank(a.gender) - genderRank(b.gender)
        if (diff !== 0) return diff
        return a.nickname.localeCompare(b.nickname, 'ko')
    })
}

export function entryPlayerIds(e: SimpleMatchEntry): string[] {
    if (e.matchType === 'singles') return [e.player1Id, e.player2Id].filter(Boolean)
    return [...e.team1, ...e.team2].filter(Boolean)
}

// 편집 진입 시 기존 매치에 배정된 모든 선수 id를 모아 초기 참석자 명단으로 복원한다.
export function collectAttendeeIds(entries: SimpleMatchEntry[]): string[] {
    const ids = new Set<string>()
    for (const e of entries) {
        for (const id of entryPlayerIds(e)) ids.add(id)
    }
    return [...ids]
}

// 편집 진입 시 정규화된 MatchGame → 폼 상태(코트 목록 + 평면 엔트리)로 역매핑.
// courts: order 순 정렬, surface 그대로 보존.
// entries: match.courtId를 그대로 사용 (DB UUID가 FormCourt.id와 일치).
export function matchGameToFormState(matchGame: MatchGame): {
    courts: FormCourt[]
    entries: SimpleMatchEntry[]
} {
    const courts: FormCourt[] = [...matchGame.courts]
        .sort((a, b) => a.order - b.order)
        .map((c) => ({
            id: c.id,
            label: c.label,
            surface: (c.surface ?? '') as CourtSurface | '',
        }))

    const entries: SimpleMatchEntry[] = matchGame.matches.map((m) => {
        let startAt = ''
        let endAt = ''
        for (const round of matchGame.rounds) {
            const ts = round.timeSlots.find((t) => t.id === m.timeSlotId)
            if (ts) { startAt = ts.startAt; endAt = ts.endAt; break }
        }
        return {
            id: m.id,
            courtId: m.courtId,
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

    return { courts, entries }
}

// 폼 제출 전 유효성 검사. 오류가 없으면 null 반환.
export function validateEntries(
    entries: SimpleMatchEntry[],
    courts: FormCourt[],
    allPlayers: User[]
): string | null {
    if (courts.length === 0) return '코트를 1개 이상 추가해주세요.'
    for (const c of courts) {
        if (!c.label.trim()) return '모든 코트의 이름을 입력해주세요.'
    }
    if (entries.length === 0) return '게임을 1개 이상 추가해주세요.'

    const courtIds = new Set(courts.map((c) => c.id))
    for (const e of entries) {
        if (!e.courtId || !courtIds.has(e.courtId)) return '모든 게임의 코트를 선택해주세요.'
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

// 폼 상태(courts + entries) → 정규화된 courts / rounds / matches 3계층으로 변환.
// 코트: FormCourt 목록을 그대로 Court[]로 변환 (surface 포함).
// 타임슬롯: "startAt|endAt" 복합 키로 중복 판단.
// 현재 폼은 단일 라운드("1st")만 지원.
export function buildMatchGamePayload(
    entries: SimpleMatchEntry[],
    courts: FormCourt[]
): MatchGamePayload {
    const builtCourts: Court[] = courts.map((c, i) => ({
        id: c.id,
        label: c.label,
        order: i + 1,
        surface: (c.surface as CourtSurface) || undefined,
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
        const court = builtCourts.find((c) => c.id === e.courtId)!
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

    return { courts: builtCourts, rounds: [round], matches }
}

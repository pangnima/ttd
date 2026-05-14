import type { Match } from '@/types'

const MATCHES_KEY = 'tc_matches'

function isClient(): boolean {
    return typeof window !== 'undefined'
}

export function getStoredMatches(): Match[] {
    if (!isClient()) return []
    try {
        const raw = localStorage.getItem(MATCHES_KEY)
        return raw ? (JSON.parse(raw) as Match[]) : []
    } catch {
        return []
    }
}

export function getStoredMatchesByTournamentId(tournamentId: string): Match[] {
    return getStoredMatches().filter((m) => m.tournamentId === tournamentId)
}

export function saveMatches(matches: Match[]): void {
    if (!isClient()) return
    const all = getStoredMatches()
    const newIds = new Set(matches.map((m) => m.id))
    const others = all.filter((m) => !newIds.has(m.id))
    localStorage.setItem(MATCHES_KEY, JSON.stringify([...others, ...matches]))
}

export function saveMatch(match: Match): void {
    if (!isClient()) return
    const all = getStoredMatches()
    const idx = all.findIndex((m) => m.id === match.id)
    if (idx >= 0) {
        all[idx] = match
    } else {
        all.push(match)
    }
    localStorage.setItem(MATCHES_KEY, JSON.stringify(all))
}

export function updateStoredMatch(matchId: string, updates: Partial<Match>): void {
    if (!isClient()) return
    const all = getStoredMatches()
    const idx = all.findIndex((m) => m.id === matchId)
    if (idx >= 0) {
        all[idx] = { ...all[idx], ...updates }
        localStorage.setItem(MATCHES_KEY, JSON.stringify(all))
    }
}

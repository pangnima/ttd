import type { Game, Tournament } from '@/types'

const TOURNAMENTS_KEY = 'tc_tournaments'

function isClient(): boolean {
    return typeof window !== 'undefined'
}

export function getStoredTournaments(): Tournament[] {
    if (!isClient()) return []
    try {
        const raw = localStorage.getItem(TOURNAMENTS_KEY)
        return raw ? (JSON.parse(raw) as Tournament[]) : []
    } catch {
        return []
    }
}

export function getStoredTournamentsByClubId(clubId: string): Tournament[] {
    return getStoredTournaments().filter((t) => t.clubId === clubId)
}

export function getStoredTournamentById(id: string): Tournament | undefined {
    return getStoredTournaments().find((t) => t.id === id)
}

export function saveTournament(tournament: Tournament): void {
    if (!isClient()) return
    const all = getStoredTournaments()
    const idx = all.findIndex((t) => t.id === tournament.id)
    if (idx >= 0) {
        all[idx] = tournament
    } else {
        all.push(tournament)
    }
    localStorage.setItem(TOURNAMENTS_KEY, JSON.stringify(all))
}

export function updateStoredTournament(id: string, updates: Partial<Tournament>): void {
    if (!isClient()) return
    const all = getStoredTournaments()
    const idx = all.findIndex((t) => t.id === id)
    if (idx >= 0) {
        all[idx] = { ...all[idx], ...updates }
        localStorage.setItem(TOURNAMENTS_KEY, JSON.stringify(all))
    }
}

export function deleteStoredTournament(id: string): void {
    if (!isClient()) return
    const filtered = getStoredTournaments().filter((t) => t.id !== id)
    localStorage.setItem(TOURNAMENTS_KEY, JSON.stringify(filtered))
}

export function updateGameInTournament(
    tournamentId: string,
    gameId: string,
    updates: Partial<Game>
): void {
    if (!isClient()) return
    const all = getStoredTournaments()
    const idx = all.findIndex((t) => t.id === tournamentId)
    if (idx < 0) return
    const tournament = all[idx]
    const gameIdx = tournament.games.findIndex((g) => g.id === gameId)
    if (gameIdx < 0) return
    tournament.games[gameIdx] = { ...tournament.games[gameIdx], ...updates }
    all[idx] = tournament
    localStorage.setItem(TOURNAMENTS_KEY, JSON.stringify(all))
}

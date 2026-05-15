import type { Match, MatchGame } from '@/types'

const MATCH_GAMES_KEY = 'tc_match_games'

function isClient(): boolean {
    return typeof window !== 'undefined'
}

export function getStoredMatchGames(): MatchGame[] {
    if (!isClient()) return []
    try {
        const raw = localStorage.getItem(MATCH_GAMES_KEY)
        return raw ? (JSON.parse(raw) as MatchGame[]) : []
    } catch {
        return []
    }
}

export function getStoredMatchGamesByClubId(clubId: string): MatchGame[] {
    return getStoredMatchGames().filter((mg) => mg.clubId === clubId)
}

export function getStoredMatchGameById(id: string): MatchGame | undefined {
    return getStoredMatchGames().find((mg) => mg.id === id)
}

export function saveMatchGame(matchGame: MatchGame): void {
    if (!isClient()) return
    const all = getStoredMatchGames()
    const idx = all.findIndex((mg) => mg.id === matchGame.id)
    if (idx >= 0) {
        all[idx] = matchGame
    } else {
        all.push(matchGame)
    }
    localStorage.setItem(MATCH_GAMES_KEY, JSON.stringify(all))
}

export function updateStoredMatchGame(id: string, updates: Partial<MatchGame>): void {
    if (!isClient()) return
    const all = getStoredMatchGames()
    const idx = all.findIndex((mg) => mg.id === id)
    if (idx >= 0) {
        all[idx] = { ...all[idx], ...updates }
        localStorage.setItem(MATCH_GAMES_KEY, JSON.stringify(all))
    }
}

export function deleteStoredMatchGame(id: string): void {
    if (!isClient()) return
    const filtered = getStoredMatchGames().filter((mg) => mg.id !== id)
    localStorage.setItem(MATCH_GAMES_KEY, JSON.stringify(filtered))
}

export function updateMatchInMatchGame(
    matchGameId: string,
    matchId: string,
    updates: Partial<Match>
): void {
    if (!isClient()) return
    const all = getStoredMatchGames()
    const idx = all.findIndex((mg) => mg.id === matchGameId)
    if (idx < 0) return
    const matchGame = all[idx]
    const matchIdx = matchGame.matches.findIndex((m) => m.id === matchId)
    if (matchIdx < 0) return
    matchGame.matches[matchIdx] = { ...matchGame.matches[matchIdx], ...updates }
    all[idx] = matchGame
    localStorage.setItem(MATCH_GAMES_KEY, JSON.stringify(all))
}

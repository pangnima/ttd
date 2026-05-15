import type { MatchGame } from '@/types'

export const dummyMatchGames: MatchGame[] = []

export function getMatchGamesByClubId(clubId: string): MatchGame[] {
    return dummyMatchGames.filter((mg) => mg.clubId === clubId)
}

export function getMatchGameById(id: string): MatchGame | undefined {
    return dummyMatchGames.find((mg) => mg.id === id)
}

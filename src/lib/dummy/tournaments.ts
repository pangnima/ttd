import type { Tournament } from '@/types'

export const dummyTournaments: Tournament[] = []

export function getTournamentsByClubId(clubId: string): Tournament[] {
    return dummyTournaments.filter((t) => t.clubId === clubId)
}

export function getTournamentById(id: string): Tournament | undefined {
    return dummyTournaments.find((t) => t.id === id)
}

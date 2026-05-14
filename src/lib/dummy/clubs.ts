import type { Club } from '@/types'

export const dummyClubs: Club[] = []

export function getClubById(id: string): Club | undefined {
    return dummyClubs.find((club) => club.id === id)
}

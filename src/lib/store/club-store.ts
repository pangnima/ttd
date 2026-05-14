import type { Club } from '@/types'

const CLUBS_KEY = 'tc_clubs'

function isClient(): boolean {
    return typeof window !== 'undefined'
}

export function getStoredClubs(): Club[] {
    if (!isClient()) return []
    try {
        const raw = localStorage.getItem(CLUBS_KEY)
        return raw ? (JSON.parse(raw) as Club[]) : []
    } catch {
        return []
    }
}

export function saveClub(club: Club): void {
    if (!isClient()) return
    const all = getStoredClubs()
    const idx = all.findIndex((c) => c.id === club.id)
    if (idx >= 0) {
        all[idx] = club
    } else {
        all.push(club)
    }
    localStorage.setItem(CLUBS_KEY, JSON.stringify(all))
}

export function deleteStoredClub(id: string): void {
    if (!isClient()) return
    const filtered = getStoredClubs().filter((c) => c.id !== id)
    localStorage.setItem(CLUBS_KEY, JSON.stringify(filtered))
}

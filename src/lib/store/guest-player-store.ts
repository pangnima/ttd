import type { User } from '@/types'

const GUEST_KEY = 'tc_guest_players'

function isClient(): boolean {
    return typeof window !== 'undefined'
}

export function getGuestPlayers(): User[] {
    if (!isClient()) return []
    try {
        const raw = localStorage.getItem(GUEST_KEY)
        return raw ? (JSON.parse(raw) as User[]) : []
    } catch {
        return []
    }
}

export function saveGuestPlayer(nickname: string): User {
    const today = new Date().toISOString().split('T')[0]
    const guest: User = {
        id: `guest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
        email: '',
        name: nickname,
        nickname,
        role: 'member',
        phone: '',
        gender: 'male',
        dominantHand: 'right',
        ntrp: 0,
        tennisStartDate: today,
        createdAt: today,
    }
    const all = getGuestPlayers()
    all.push(guest)
    if (isClient()) localStorage.setItem(GUEST_KEY, JSON.stringify(all))
    return guest
}

export function deleteGuestPlayer(id: string): void {
    if (!isClient()) return
    const filtered = getGuestPlayers().filter((g) => g.id !== id)
    localStorage.setItem(GUEST_KEY, JSON.stringify(filtered))
}

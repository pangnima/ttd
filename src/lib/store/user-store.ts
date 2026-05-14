import type { User } from '@/types'

const USER_KEY = 'tc_profile'

function isClient(): boolean {
    return typeof window !== 'undefined'
}

export function getStoredProfile(): Partial<User> | null {
    if (!isClient()) return null
    try {
        const raw = localStorage.getItem(USER_KEY)
        return raw ? (JSON.parse(raw) as Partial<User>) : null
    } catch {
        return null
    }
}

export function saveProfile(updates: Partial<User>): void {
    if (!isClient()) return
    const current = getStoredProfile() ?? {}
    localStorage.setItem(USER_KEY, JSON.stringify({ ...current, ...updates }))
}

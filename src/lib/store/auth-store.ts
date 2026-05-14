const AUTH_KEY = 'tc_current_user_id'

function isClient(): boolean {
    return typeof window !== 'undefined'
}

export function getCurrentUserId(): string | null {
    if (!isClient()) return null
    return localStorage.getItem(AUTH_KEY)
}

export function setCurrentUserId(id: string): void {
    if (!isClient()) return
    localStorage.setItem(AUTH_KEY, id)
}

export function clearCurrentUser(): void {
    if (!isClient()) return
    localStorage.removeItem(AUTH_KEY)
}

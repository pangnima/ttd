import type { CourtSurface, Match, PersonalMatch } from '@/types'

// ── 번들 구성 타입 ──────────────────────────────────────
export type BundleWithMatches = { matches: Match[] }
export type BundleWithGameMeta = { gameMetaById: Record<string, { date: string }> }
export type BundleWithPersonal = { personalMatches: PersonalMatch[] }
export type BundleWithSurface = { courtSurfaceByMatchId: Record<string, CourtSurface | null> }
export type BundleWithUserMap = { userMap: Map<string, { ntrp?: number }> }

// ── 공통 승패 타입 ──────────────────────────────────────
export type WinLoss = {
    wins: number
    losses: number
    draws: number
    total: number
    winRate: number   // decisive 기준 (draws 제외)
}

export function calcWinRate(wins: number, losses: number): number {
    const decisive = wins + losses
    if (decisive === 0) return 0
    return Math.round((wins / decisive) * 100)
}

export function emptyWL(): WinLoss {
    return { wins: 0, losses: 0, draws: 0, total: 0, winRate: 0 }
}

// ── 내부 매치 헬퍼 ──────────────────────────────────────

export function isUserTeam1(m: Match, userId: string): boolean {
    if (m.matchType === 'singles') return m.player1Id === userId
    return (m.team1 ?? []).includes(userId)
}

export function getMatchOutcome(m: Match, userId: string): 'win' | 'loss' | 'draw' {
    if (!m.result) return 'draw'
    const winnerId = m.result.winnerId
    if (winnerId === 'draw') return 'draw'
    const isTeam1 = isUserTeam1(m, userId)
    if (winnerId === 'team1') return isTeam1 ? 'win' : 'loss'
    return isTeam1 ? 'loss' : 'win'
}

export function getOpponentIds(m: Match, userId: string): string[] {
    if (m.matchType === 'singles') {
        if (m.player1Id === userId) return m.player2Id ? [m.player2Id] : []
        return m.player1Id ? [m.player1Id] : []
    }
    const isTeam1 = (m.team1 ?? []).includes(userId)
    return isTeam1 ? (m.team2 ?? []) : (m.team1 ?? [])
}

export function addOutcome(wl: WinLoss, o: 'win' | 'loss' | 'draw') {
    wl.total++
    if (o === 'win') wl.wins++
    else if (o === 'loss') wl.losses++
    else wl.draws++
}

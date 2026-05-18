import type { Match, MatchType } from '@/types'

export type MatchTypeStats = {
    matchType: MatchType
    wins: number
    losses: number
    draws: number
    totalMatches: number
    winRate: number
    setsWon: number
    setsLost: number
}

export type PlayerStats = {
    wins: number
    losses: number
    draws: number
    totalMatches: number
    winRate: number
    setsWon: number
    setsLost: number
    byMatchType: MatchTypeStats[]
}

export type HeadToHead = {
    opponentId: string
    wins: number
    losses: number
    draws: number
}

function getUserSide(match: Match, userId: string): 'team1' | 'team2' | null {
    if (match.matchType === 'singles') {
        if (match.player1Id === userId) return 'team1'
        if (match.player2Id === userId) return 'team2'
        return null
    }
    if (match.team1?.includes(userId)) return 'team1'
    if (match.team2?.includes(userId)) return 'team2'
    return null
}

/** 특정 유저가 참여한 경기만 필터 (단식 + 복식 모두) */
export function getMatchesByUser(matches: Match[], userId: string): Match[] {
    return matches.filter((m) => getUserSide(m, userId) !== null)
}

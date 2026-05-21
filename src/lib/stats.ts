import type { MatchType } from '@/types'

type MatchTypeStats = {
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

export const EMPTY_PLAYER_STATS: PlayerStats = {
    wins: 0,
    losses: 0,
    draws: 0,
    totalMatches: 0,
    winRate: 0,
    setsWon: 0,
    setsLost: 0,
    byMatchType: [],
}

export type HeadToHead = {
    opponentId: string
    wins: number
    losses: number
    draws: number
}

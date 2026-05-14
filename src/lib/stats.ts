import type { Match, MatchType } from '@/types'

export type MatchTypeStats = {
    matchType: MatchType
    wins: number
    losses: number
    totalMatches: number
    winRate: number
    setsWon: number
    setsLost: number
}

export type PlayerStats = {
    wins: number
    losses: number
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
}

/** 특정 유저가 참여한 경기만 필터 */
export function getMatchesByUser(matches: Match[], userId: string): Match[] {
    return matches.filter(
        (m) => m.player1Id === userId || m.player2Id === userId
    )
}

/** 전체 승/패/세트 통계 계산 + 종목별 분류 */
export function calcPlayerStats(
    matches: Match[],
    userId: string
): PlayerStats {
    const myMatches = getMatchesByUser(matches, userId).filter(
        (m) => m.status === 'finished' && m.result
    )

    let wins = 0
    let losses = 0
    let setsWon = 0
    let setsLost = 0

    const matchTypeMap = new Map<
        MatchType,
        { wins: number; losses: number; setsWon: number; setsLost: number }
    >()

    for (const match of myMatches) {
        const result = match.result!
        const isP1 = match.player1Id === userId
        const isWin = result.winnerId === userId

        if (isWin) wins++
        else losses++

        for (const set of result.sets) {
            setsWon  += isP1 ? set.player1 : set.player2
            setsLost += isP1 ? set.player2 : set.player1
        }

        if (match.matchType) {
            const mt = match.matchType
            const entry = matchTypeMap.get(mt) ?? { wins: 0, losses: 0, setsWon: 0, setsLost: 0 }
            if (isWin) entry.wins++
            else entry.losses++
            for (const set of result.sets) {
                entry.setsWon  += isP1 ? set.player1 : set.player2
                entry.setsLost += isP1 ? set.player2 : set.player1
            }
            matchTypeMap.set(mt, entry)
        }
    }

    const totalMatches = wins + losses
    const winRate = totalMatches === 0 ? 0 : Math.round((wins / totalMatches) * 100)

    const byMatchType: MatchTypeStats[] = Array.from(matchTypeMap.entries()).map(([matchType, s]) => {
        const total = s.wins + s.losses
        return {
            matchType,
            wins: s.wins,
            losses: s.losses,
            totalMatches: total,
            winRate: total === 0 ? 0 : Math.round((s.wins / total) * 100),
            setsWon: s.setsWon,
            setsLost: s.setsLost,
        }
    })

    return { wins, losses, totalMatches, winRate, setsWon, setsLost, byMatchType }
}

/** 상대별 전적 계산 */
export function calcHeadToHead(matches: Match[], userId: string): HeadToHead[] {
    const myMatches = getMatchesByUser(matches, userId).filter(
        (m) => m.status === 'finished' && m.result
    )

    const map = new Map<string, HeadToHead>()

    for (const match of myMatches) {
        const opponentId = match.player1Id === userId ? match.player2Id : match.player1Id
        const entry = map.get(opponentId) ?? { opponentId, wins: 0, losses: 0 }

        if (match.result!.winnerId === userId) entry.wins++
        else entry.losses++

        map.set(opponentId, entry)
    }

    return Array.from(map.values()).sort((a, b) => b.wins + b.losses - (a.wins + a.losses))
}

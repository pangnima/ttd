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

// 단식/복식 통합: 사용자가 team1 측인지 team2 측인지 판별
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

/** 전체 승/패/세트 통계 계산 + 종목별 분류 */
export function calcPlayerStats(matches: Match[], userId: string): PlayerStats {
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
        const side = getUserSide(match, userId)
        if (!side) continue

        const isWin = result.winnerId === side
        if (isWin) wins++
        else losses++

        for (const set of result.sets) {
            setsWon  += side === 'team1' ? set.team1 : set.team2
            setsLost += side === 'team1' ? set.team2 : set.team1
        }

        if (match.matchType) {
            const mt = match.matchType
            const entry = matchTypeMap.get(mt) ?? { wins: 0, losses: 0, setsWon: 0, setsLost: 0 }
            if (isWin) entry.wins++
            else entry.losses++
            for (const set of result.sets) {
                entry.setsWon  += side === 'team1' ? set.team1 : set.team2
                entry.setsLost += side === 'team1' ? set.team2 : set.team1
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

/** 상대별 전적 (단식 전용) */
export function calcHeadToHead(matches: Match[], userId: string): HeadToHead[] {
    const myMatches = matches
        .filter((m) => m.matchType === 'singles')
        .filter((m) => getUserSide(m, userId) !== null)
        .filter((m) => m.status === 'finished' && m.result)

    const map = new Map<string, HeadToHead>()

    for (const match of myMatches) {
        const opponentId = match.player1Id === userId ? match.player2Id : match.player1Id
        if (!opponentId) continue
        const entry = map.get(opponentId) ?? { opponentId, wins: 0, losses: 0 }

        const side = getUserSide(match, userId)
        if (match.result!.winnerId === side) entry.wins++
        else entry.losses++

        map.set(opponentId, entry)
    }

    return Array.from(map.values()).sort((a, b) => b.wins + b.losses - (a.wins + a.losses))
}

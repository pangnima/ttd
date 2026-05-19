// 통계 계산 본체는 Supabase RPC(get_user_match_stats, get_user_head_to_head)로 이전됨.
// 이 파일에는 클라이언트 측에서 쓰이는 유저 필터 헬퍼와 타입 정의만 남아있음.
import type { Match, MatchType } from '@/types'

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

export type HeadToHead = {
    opponentId: string
    wins: number
    losses: number
    draws: number
}

// 단식: player1Id/player2Id로 참가 여부 판단.
// 복식: team1/team2 배열 includes로 판단 (배열 contains).
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

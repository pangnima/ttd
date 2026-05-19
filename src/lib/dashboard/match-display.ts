import type { Match } from '@/types'

export type CourtSide = 'ad' | 'deuce'

export type MatchView = {
    matchId: string
    matchGameId: string
    matchType: Match['matchType']
    outcome: 'win' | 'loss' | 'draw' | 'unknown'
    mySets: number
    oppSets: number
    myCourt?: CourtSide
    partner?: { id: string; court: CourtSide }
    opponents: Array<{ id: string; court?: CourtSide }>
}

// 단식·복식 모두 커버하는 매치 뷰 변환. 본인 시점 기준 승패·파트너·상대·코트 산출.
export function toMatchView(match: Match, userId: string): MatchView {
    const isSingles = match.matchType === 'singles'

    const mySide: 'team1' | 'team2' | null = isSingles
        ? match.player1Id === userId
            ? 'team1'
            : match.player2Id === userId
              ? 'team2'
              : null
        : match.team1?.includes(userId)
          ? 'team1'
          : match.team2?.includes(userId)
            ? 'team2'
            : null

    // 경기 데이터에 본인이 참여하지 않은 비정상 케이스
    if (mySide === null) {
        return {
            matchId: match.id,
            matchGameId: match.matchGameId,
            matchType: match.matchType,
            outcome: 'unknown',
            mySets: 0,
            oppSets: 0,
            opponents: [],
        }
    }

    const sets = match.result?.sets ?? []
    const mySets = sets.reduce((acc, s) => acc + (mySide === 'team1' ? s.team1 : s.team2), 0)
    const oppSets = sets.reduce((acc, s) => acc + (mySide === 'team1' ? s.team2 : s.team1), 0)

    let outcome: MatchView['outcome'] = 'unknown'
    if (match.result?.winnerId) {
        if (match.result.winnerId === 'draw') outcome = 'draw'
        else if (match.result.winnerId === mySide) outcome = 'win'
        else outcome = 'loss'
    }

    if (isSingles) {
        const oppId = mySide === 'team1' ? match.player2Id : match.player1Id
        return {
            matchId: match.id,
            matchGameId: match.matchGameId,
            matchType: match.matchType,
            outcome,
            mySets,
            oppSets,
            opponents: oppId ? [{ id: oppId }] : [],
        }
    }

    // 복식: 본인 팀 adPlayerId 필드로 코트 결정
    const myAdPlayerId = mySide === 'team1' ? match.team1AdPlayerId : match.team2AdPlayerId
    const oppAdPlayerId = mySide === 'team1' ? match.team2AdPlayerId : match.team1AdPlayerId

    const myCourt: CourtSide = myAdPlayerId === userId ? 'ad' : 'deuce'

    const myTeam = (mySide === 'team1' ? match.team1 : match.team2) ?? []
    const partnerId = myTeam.find((id) => id !== userId)
    let partner: MatchView['partner'] | undefined
    if (partnerId) {
        // myAdPlayerId가 본인이면 파트너는 deuce, 아니면 파트너가 ad(지정 있을 때)이거나 deuce
        const partnerCourt: CourtSide = myAdPlayerId === userId
            ? 'deuce'
            : myAdPlayerId === partnerId
              ? 'ad'
              : 'deuce'
        partner = { id: partnerId, court: partnerCourt }
    }

    const oppTeam = (mySide === 'team1' ? match.team2 : match.team1) ?? []
    const opponents: MatchView['opponents'] = oppTeam.map((id) => {
        const court: CourtSide = oppAdPlayerId === id ? 'ad' : 'deuce'
        return { id, court }
    }).sort((a, b) => {
        if (a.court === 'ad' && b.court !== 'ad') return -1
        if (a.court !== 'ad' && b.court === 'ad') return 1
        return 0
    })

    return {
        matchId: match.id,
        matchGameId: match.matchGameId,
        matchType: match.matchType,
        outcome,
        mySets,
        oppSets,
        myCourt,
        partner,
        opponents,
    }
}

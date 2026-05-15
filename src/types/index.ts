export type User = {
    id: string
    email: string
    name: string
    nickname: string
    role: 'admin' | 'member'
    profileImage?: string
    phone: string
    gender: 'male' | 'female'
    dominantHand: 'right' | 'left'
    ntrp: number
    tennisStartDate: string
    createdAt: string
}

export type Club = {
    id: string
    name: string
    description: string
    region: string
    isPublic: boolean
    memberCount: number
    ownerId: string
    createdAt: string
}

export type ClubMember = {
    userId: string
    clubId: string
    role: 'owner' | 'member'
    status: 'pending' | 'approved' | 'rejected'
    joinedAt: string
}

// ── 대진표(MatchGame) ────────────────────────────────

export type MatchType = 'singles' | 'men_doubles' | 'women_doubles' | 'mixed_doubles'

export type TimeSlot = {
    id: string
    startAt: string   // "08:05"
    endAt: string     // "08:30"
}

export type Round = {
    id: string
    label: string     // "1st", "2nd", "3rd"
    order: number
    timeSlots: TimeSlot[]
}

export type Court = {
    id: string
    label: string     // "1코트", "2코트"
    order: number
}

export type MatchResult = {
    sets: Array<{ team1: number; team2: number }>
    winnerId: string  // 단식: player1Id or player2Id / 복식: 'team1' | 'team2'
}

export type Match = {
    id: string
    matchGameId: string
    roundId: string
    courtId: string
    timeSlotId: string
    matchType: MatchType
    player1Id?: string    // 단식
    player2Id?: string    // 단식
    team1?: string[]      // 복식 [userId, userId]
    team2?: string[]      // 복식 [userId, userId]
    status: 'scheduled' | 'finished'
    result?: MatchResult
}

export type MatchGame = {
    id: string
    clubId: string
    name: string
    date: string          // "2025-04-12"
    courts: Court[]
    rounds: Round[]
    matches: Match[]
    isFixed: boolean
    createdAt: string
}

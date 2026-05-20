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
    isGuest: boolean   // true면 게스트 선수 (public.users에 존재하지만 Auth 계정 없음)
}

export type Club = {
    id: string
    name: string
    description: string
    region: string
    isPublic: boolean   // true면 미가입 사용자도 검색/조회 가능
    memberCount: number
    ownerId: string
    createdAt: string
    logoUrl?: string
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
    // 외래키가 아닌 사이드 식별자 리터럴.
    // 단식에서도 player1 = team1, player2 = team2 로 매핑되는 규약에 따름.
    winnerId: 'team1' | 'team2' | 'draw'
}

export type Match = {
    id: string
    matchGameId: string
    roundId: string
    courtId: string
    timeSlotId: string
    matchType: MatchType
    // 단식/복식 필드는 상호 배제:
    //   matchType === 'singles'  → player1Id / player2Id 만 유효
    //   matchType !== 'singles'  → team1 / team2 배열만 유효
    player1Id?: string    // 단식
    player2Id?: string    // 단식
    team1?: string[]      // 복식 [userId, userId]
    team2?: string[]      // 복식 [userId, userId]
    // 복식 코트 배치: team 배열 중 애드코트(백핸드/레프트 사이드)를 맡은 선수 ID.
    // null/undefined면 미지정 (기본: 듀스코트/포핸드 사이드).
    // 단식 경기에서는 사용하지 않음.
    team1AdPlayerId?: string
    team2AdPlayerId?: string
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
    isFixed: boolean      // true면 결과 확정 — 수정 잠금, 통계 집계 반영
    createdAt: string
}

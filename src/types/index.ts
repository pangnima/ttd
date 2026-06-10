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
    statsHidden: boolean  // true면 승률·승무패를 타인에게 비공개
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
    role: 'owner' | 'officer' | 'member'
    status: 'pending' | 'approved' | 'rejected'
    joinedAt: string
}

// 클럽별 동적 레이팅(클럽 NTRP). matchesPlayed로 잠정기 판단. docs/rating-system.md
export type ClubRating = {
    rating: number
    matchesPlayed: number
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

export type CourtSurface = 'hard' | 'clay' | 'grass' | 'other'

export type Court = {
    id: string
    label: string     // "1코트", "2코트"
    order: number
    surface?: CourtSurface
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
    // 편집 저장 시에만 사용 — 이 match가 유래한 기존 match의 DB id.
    // RPC가 구성 동일 여부를 확인해 점수를 이어붙이는 데 쓴다. 신규 경기/생성 시엔 undefined.
    prevMatchId?: string
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

// ── 개인 경기 (클럽 외부) ────────────────────────────────

export type PersonalMatchWinner = 'me' | 'opponent' | 'draw'

export type PersonalMatchSetScore = {
    me: number
    opp: number
}

export type PersonalMatch = {
    id: string
    userId: string
    opponentName: string
    opponentUserId?: string  // 클럽 회원과 연결된 경우 users.id, 외부 상대는 undefined
    opponentDominantHand?: 'right' | 'left'  // 외부 상대 직접 입력 시 손잡이 (회원/미입력은 undefined)
    playedAt: string        // "2025-04-12"
    matchType: MatchType
    surface?: CourtSurface
    setScores: PersonalMatchSetScore[]
    winner: PersonalMatchWinner
    notes?: string
    createdAt: string
}

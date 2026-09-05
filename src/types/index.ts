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
    ntrp: number            // 가입 시 자가선언 NTRP (불변 시드, 빈 값 방지용)
    personalNtrp?: number   // 개인경기 기반 동적 NTRP 캐시(진화값). 미보유 시 undefined
    tennisStartDate: string   // 'YYYY-MM-01' (년/월만 입력, 일은 1로 고정)
    racketBrand?: string      // 주력 라켓 브랜드 (프리셋 한글 라벨 또는 기타 직접 입력). 설정에서 수정 가능
    racketModel?: string      // 주력 라켓 모델명 (선택)
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
    courtSchedule?: string   // 정기 활동(고정코트) 시간, 자유 텍스트
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
    // 복식 세트별 애드(백) 코트를 맡은 선수 역할 (선택, 단식/미지정은 undefined).
    // 동호인 경기는 세트마다 사이드가 바뀔 수 있어 세트 단위로 보관한다.
    myAd?: 'me' | 'partner'
    oppAd?: 'opponent' | 'opponent2'
}

export type PersonalMatch = {
    id: string
    userId: string
    opponentName: string
    opponentUserId?: string  // 클럽 회원과 연결된 경우 users.id, 외부 상대는 undefined
    opponentDominantHand?: 'right' | 'left'  // 외부 상대 직접 입력 시 손잡이 (회원/미입력은 undefined)
    // ── 복식 전용: 내 파트너 (단식이면 모두 undefined) ──
    partnerUserId?: string
    partnerName?: string
    partnerDominantHand?: 'right' | 'left'
    partnerNtrp?: number    // 복식 파트너 추정 NTRP(선택) — 개인 레이팅 '내 팀' 블렌드에 반영
    // ── 복식 전용: 상대팀 2번째 선수 (단식이면 모두 undefined) ──
    opponent2UserId?: string
    opponent2Name?: string
    opponent2DominantHand?: 'right' | 'left'
    opponent2Ntrp?: number  // 복식 상대2 추정 NTRP — 개인 레이팅 상대팀 평균에 반영
    // 애드/듀스 코트는 세트마다 바뀔 수 있어 setScores 각 세트의 myAd/oppAd로 보관한다.
    playedAt: string        // "2025-04-12"
    playedTime?: string     // "18:30" (선택, 요일×시간 히트맵용). 미입력 시 undefined
    matchType: MatchType
    surface?: CourtSurface
    // 세트 1개 = 게임 1개. 빈 배열 = 결과 미확정(hasResult false) — 통계·레이팅 집계에서 제외(explodePersonalMatchSets).
    // 행 단위 승자는 없다(0045에서 세트 다수결 winner 폐기) — 게임마다 승패는 resolveSetWinner로 판정한다.
    setScores: PersonalMatchSetScore[]
    opponentNtrp?: number   // 상대(단식)/상대1(복식) 추정 NTRP — 개인 레이팅 상대 레이팅. 미입력 시 undefined
    notes?: string
    courtName?: string      // 코트명(선택, ≤40자) — 등록 폼 '최근 코트' 자동완성 후보로 재사용
    sourceRequestId?: string  // 상호 확인 대진(match_requests)에서 확정된 경기 — 있으면 수정/삭제 잠금
    sourceType?: 'direct' | 'confirmation' | 'rotation'  // 출처 (0040). 픽스처·테스트 리터럴은 생략 가능
    rotationSessionId?: string  // 로테이션 세션 tombstone id (0044) — 같은 값이면 같은 로테이션에서 분해된 게임(목록 그룹 키)
    groupSeq?: number           // 로테이션 세션 내 게임 순번 (0044). finalize 루프 순서 = 실제 입력 순서
    roomId?: string             // 매칭 리스트에 노출된 기록이면 방 id (0046) — 카드 '매칭 리스트에서 보기' 링크
    // 다른 참가자의 기록에서 파생된 관점 복사본 (0050). 방의 '대표 게임' 판정 술어(is_perspective=false)이며,
    // ⚠ 수락자(대표) 행도 true다 — '액션 불가'의 근거로 쓰면 안 된다(그 판정은 confirmation.viewerIsParty).
    isPerspective?: boolean
    // 상호 확인 경기의 결과 제안/확인 상태 (목록 조회 시 match_requests에서 부착, 그 외 경로는 undefined)
    confirmation?: PersonalMatchConfirmation
    createdAt: string
}

/**
 * 상호 확인 경기의 결과 제안/확인 상태 — match_requests.result_status를 보는 사람(viewer) 관점으로 정리한 것.
 * none: 결과 없음 / proposed: 한쪽이 세트 제안 → 상대 확인 대기 / confirmed: 양측 확정 / disputed: 이의 제기됨(재제안 가능)
 */
export type PersonalMatchConfirmation = {
    requestId: string
    status: MatchResultStatus
    proposedByMe: boolean
    proposedSets: PersonalMatchSetScore[]  // viewer 관점으로 반전 완료된 제안 세트
    disputeReason?: string
    // viewer가 요청 당사자(requester 또는 대표 확인자 opponent)인가 — 제안·확인·이의 3종 RPC의 통과 조건과 같다.
    // false면 복식 파트너·상대2의 관점 행이라 대표의 확인을 기다리는 것 외에 할 수 있는 일이 없다.
    viewerIsParty: boolean
}

// ── 로테이션(파트너 교체) 복식 세션 (0038) ────────────────────────────
// 등록 시 선수 풀만 저장하고, 게임(팀 구성+세트)은 카드 '결과 입력'에서 입력해 게임별 personal_matches로 분해된다.

export type RotationPoolPlayer = {
    userId?: string
    name: string
    hand?: 'right' | 'left'
    ntrp?: number
}

export type RotationSession = {
    id: string
    userId: string
    playedAt: string        // "2025-04-12"
    playedTime: string      // "18:30"
    matchType: MatchType    // 복식 3종
    surface: CourtSurface
    notes?: string
    courtName?: string      // finalize 시 모든 게임 행에 상속
    players: RotationPoolPlayer[]  // 나 제외, 3명 이상
    createdAt: string
    roomId?: string         // 매칭 리스트에 노출된 세션이면 방 id (0046)
}

// ── 매칭 리스트(매칭 룸) (0046·0048) ────────────────────────────────
// 등록 폼에서 '리스트에 노출'을 켠 기록이 방 1개가 된다. 공개 메타는 로그인 회원 전원이 보고,
// 상세(참가자·메모·게임)는 방장·초대 수락자·비밀번호 입장자만 본다(get_match_room_detail RPC 게이트).
// 정원은 없다 — 비밀번호를 알고 들어오면 곧 참가자이고, 방장은 들어온 참가자로 게임을 여러 건 구성한다(0048).

export type MatchRoomSourceKind = 'direct' | 'confirmation' | 'rotation'
export type MatchRoomMemberRole = 'host' | 'player'
// invited → joined|declined (초대 응답) / 비밀번호 입장 = player·joined (거절했던 사람도 다시 들어오면 joined)
export type MatchRoomMemberStatus = 'invited' | 'joined' | 'declined'
export type MatchRoomSourceRole = 'opponent' | 'partner' | 'opponent2' | 'pool'

export type MatchRoomHost = {
    id: string
    name: string
    nickname: string
    profileImage?: string
    deleted: boolean
}

export type MatchRoomViewer = { role: MatchRoomMemberRole; status: MatchRoomMemberStatus }

// 방 공개 메타 (match_rooms 행) — 출처 기록에서 복사되며 자유 기록 수정 시 트리거가 동기화
export type MatchRoomMeta = {
    id: string
    hostUserId: string
    sourceKind: MatchRoomSourceKind
    playedAt: string        // "2025-04-12"
    playedTime?: string     // "18:00"
    matchType: MatchType
    surface?: CourtSurface
    courtName?: string
    // 방의 대표 게임이 1건 이상이고 전부 확정 — 매칭 리스트에서 '지난 경기'로 내려간다 (0049)
    isSettled: boolean
}

// 목록 카드용 — 참가 인원(방장 + joined 참가자)·방장·내 멤버 상태 포함
export type MatchRoomSummary = MatchRoomMeta & {
    joinedCount: number
    host: MatchRoomHost
    viewer?: MatchRoomViewer
}

export type MatchRoomMember = {
    userId: string
    name: string
    nickname: string
    profileImage?: string
    deleted: boolean
    role: MatchRoomMemberRole
    status: MatchRoomMemberStatus
    sourceRole?: MatchRoomSourceRole
}

export type MatchRoomParticipantRef = { role: string; name: string; userId?: string }

/**
 * 방의 대표 게임 한 벌 (0049) — 작성자가 방장이 아니어도 방 전원에게 보인다.
 * 참가자 각자의 관점 복사본은 같은 게임이므로 목록에서 제외되고, 여기 나오는 행은 작성자(owner) 관점이다.
 * 세트 없는 행(모집 중·결과 미입력·결과 확인 대기) 포함.
 */
export type MatchRoomGame = {
    id: string
    groupSeq?: number
    matchType: MatchType
    setScores: PersonalMatchSetScore[]
    participants: MatchRoomParticipantRef[]
    ownerUserId: string
    ownerName: string
    sourceType: 'direct' | 'confirmation' | 'rotation'
    sourceRequestId?: string          // 상호 확인 게임이면 협상 id (결과 제안·확인은 개인 경기 카드에서)
    resultStatus?: MatchResultStatus  // 상호 확인 게임의 결과 협상 상태
}

export type MatchRoomSource =
    | { kind: 'direct' }
    | {
        kind: 'confirmation'
        requestStatus?: MatchRequestStatus
        resultStatus?: MatchResultStatus
        repName?: string        // 대표 확인자 — 수락 전에는 멤버 행이 없어 이름만 표시
        repUserId?: string
        participants: MatchRoomParticipantRef[]  // 요청 파트너/상대2
    }
    | { kind: 'rotation'; isFinalized: boolean; pool?: RotationPoolPlayer[] }

export type MatchRoomDetail = {
    room: MatchRoomMeta & { notes?: string; createdAt: string }
    host: MatchRoomHost
    viewer?: MatchRoomViewer
    members: MatchRoomMember[]
    source: MatchRoomSource
    games: MatchRoomGame[]
}

// 확인 요청 허브 '매칭 리스트 초대' 카드용
export type MatchRoomInvite = {
    roomId: string
    hostName: string
    hostNickname: string
    playedAt: string
    playedTime?: string
    matchType: MatchType
    courtName?: string
    sourceRole?: MatchRoomSourceRole
}

// ── 상호 확인 대진 요청 (회원 간 단식) ────────────────────────────────

export type MatchRequestStatus = 'pending' | 'accepted' | 'rejected' | 'canceled'

// 수락 후 결과(세트) 제안/확인 상태 — none → proposed → confirmed | disputed(→ 재제안)
export type MatchResultStatus = 'none' | 'proposed' | 'confirmed' | 'disputed'

export type MatchRequest = {
    id: string
    requesterId: string
    opponentUserId: string
    playedAt: string        // "2025-04-12"
    playedTime: string      // "18:30"
    matchType: MatchType    // 단식 + 페어 고정 복식 (로테이션은 확인 요청 불가)
    surface: CourtSurface
    setScores: PersonalMatchSetScore[]  // 요청자 관점. 빈 배열 허용(결과 미확정 요청)
    notes?: string
    courtName?: string      // 수락 시 요청자·수락자 양측 기록에 복사(notes와 달리 공유)
    status: MatchRequestStatus
    roomId?: string         // 매칭 룸에서 만들어진 요청이면 방 id (0046·0049) — 방 게임·로테이션 파생 게임
    createdAt: string
    respondedAt?: string
    // ── 복식 전용 (0038): 요청자 파트너 / 상대팀 2번째. opponentUserId는 상대팀 대표 확인자 ──
    partnerUserId?: string
    partnerName?: string
    partnerDominantHand?: 'right' | 'left'
    partnerNtrp?: number
    opponent2UserId?: string
    opponent2Name?: string
    opponent2DominantHand?: 'right' | 'left'
    opponent2Ntrp?: number
    // ── 결과 제안/확인 (0037) ──
    resultStatus: MatchResultStatus
    proposedSetScores: PersonalMatchSetScore[]  // 요청자 관점. 표시 시 viewer가 상대면 반전
    proposedBy?: string
    proposedAt?: string
    disputeReason?: string
}

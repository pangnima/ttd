import type { CourtSurface, MatchType, PersonalMatchSetScore } from '@/types'

/**
 * 개인 경기 입력 페이로드 (자유 기록·상호 확인 요청 공용).
 * 'use server' 파일은 async 함수만 export할 수 있어 검증 로직과 함께 순수 모듈로 분리 —
 * actions/personal-matches.ts 와 actions/match-requests.ts 가 공유한다.
 */
export type PersonalMatchInput = {
    opponentName: string
    opponentUserId?: string  // 클럽 회원 선택 시 설정, 외부 상대는 undefined
    opponentDominantHand?: 'right' | 'left'  // 외부 상대 직접 입력 시 손잡이
    // ── 복식 전용 (단식이면 무시되고 NULL 저장) ──
    partnerName?: string
    partnerUserId?: string
    partnerDominantHand?: 'right' | 'left'
    partnerNtrp?: number  // 복식 파트너 추정 NTRP (1.0~7.0, 선택) — 레이팅 '내 팀' 블렌드
    opponent2Name?: string
    opponent2UserId?: string
    opponent2DominantHand?: 'right' | 'left'
    opponent2Ntrp?: number  // 복식 상대2 추정 NTRP (1.0~7.0, 필수)
    // 애드/듀스 코트는 setScores 각 세트의 myAd/oppAd로 보관한다(세트별로 다를 수 있음).
    playedAt: string
    playedTime?: string  // 'HH:MM' (선택)
    matchType: MatchType
    surface?: CourtSurface
    setScores: PersonalMatchSetScore[]  // 빈 배열 허용 — 등록 폼은 세트 없이 저장(결과 미확정)
    opponentNtrp?: number  // 상대(단식)/상대1(복식) 추정 NTRP (1.0~7.0, 필수) — 개인 레이팅 계산용
    // winner는 입력받지 않는다. 세트가 있으면 setScores로 자동 판정, 없으면 NULL(결과 미확정).
    notes?: string
}

const DOUBLES_TYPES: MatchType[] = ['men_doubles', 'women_doubles', 'mixed_doubles']

export function isDoublesMatchType(matchType: MatchType): boolean {
    return DOUBLES_TYPES.includes(matchType)
}

function isValidScore(n: number): boolean {
    return Number.isInteger(n) && n >= 0 && n <= 99
}

export type NtrpField = 'opponent' | 'partner' | 'opponent2'

type ValidateOptions = {
    // 상호 확인 요청은 회원 참가자의 NTRP를 수락 시 서버(RPC)가 파생하므로 해당 필드 검증을 건너뛴다.
    skipNtrpFor?: NtrpField[]
}

export function validatePersonalMatchInput(
    input: PersonalMatchInput,
    options: ValidateOptions = {},
): string | null {
    if (!input.opponentName.trim()) return '상대 이름을 입력해주세요.'
    if (!input.playedAt) return '경기 날짜를 입력해주세요.'
    if (!input.playedTime) return '경기 시각을 입력해주세요.'
    if (!/^\d{2}:\d{2}$/.test(input.playedTime)) return '경기 시각 형식이 올바르지 않습니다.'
    if (!['singles', 'men_doubles', 'women_doubles', 'mixed_doubles'].includes(input.matchType)) {
        return '올바른 경기 타입을 선택해주세요.'
    }
    const doubles = isDoublesMatchType(input.matchType)
    if (doubles) {
        if (!input.partnerName?.trim() && !input.partnerUserId) return '복식은 내 파트너를 입력해주세요.'
        if (!input.opponent2Name?.trim() && !input.opponent2UserId) return '복식은 상대팀 2번째 선수를 입력해주세요.'
    }
    // 코트 표면(필수)
    if (!input.surface) return '코트 표면을 선택해주세요.'
    const skip = new Set(options.skipNtrpFor ?? [])
    if (!skip.has('opponent')) {
        // 상대 NTRP(필수): 1.0~7.0 범위 (복식이면 상대1)
        if (input.opponentNtrp == null) return doubles ? '상대1 NTRP를 입력해주세요.' : '상대 NTRP를 입력해주세요.'
        if (input.opponentNtrp < 1 || input.opponentNtrp > 7) {
            return doubles ? '상대1 NTRP는 1.0~7.0 범위로 입력해주세요.' : '상대 NTRP는 1.0~7.0 범위로 입력해주세요.'
        }
    }
    if (doubles) {
        if (!skip.has('opponent2')) {
            // 상대2 NTRP(필수)
            if (input.opponent2Ntrp == null) return '상대2 NTRP를 입력해주세요.'
            if (input.opponent2Ntrp < 1 || input.opponent2Ntrp > 7) return '상대2 NTRP는 1.0~7.0 범위로 입력해주세요.'
        }
        // 파트너 NTRP(선택): 입력 시 범위 검증
        if (!skip.has('partner') && input.partnerNtrp != null && (input.partnerNtrp < 1 || input.partnerNtrp > 7)) {
            return '파트너 NTRP는 1.0~7.0 범위로 입력해주세요.'
        }
    }
    // 세트 검증: 빈 배열은 결과 미확정으로 허용. 로테이션은 클라(validateRotation)가 세트 필수를 보장한다.
    return validateSetScores(input.setScores, { min: 0 })
}

type SetScoresOptions = {
    // 허용 세트 개수 범위. 기본 1~5 (결과 등록용). 등록 폼은 min 0(미확정 허용).
    min?: number
    max?: number
}

/**
 * 세트 스코어 배열 검증 — 각 세트 점수가 0~99 정수, 0-0(미입력) 세트 금지, 세트별 애드/듀스 enum(선택).
 * 결과 등록 액션(updatePersonalMatchSetsAction·proposeMatchResultAction)과 등록 폼 검증이 공유하며,
 * DB helper validate_set_scores와 동일 규칙이다.
 */
export function validateSetScores(sets: PersonalMatchSetScore[], options: SetScoresOptions = {}): string | null {
    const { min = 1, max = 5 } = options
    if (!Array.isArray(sets)) return '세트 스코어를 올바르게 입력해주세요.'
    if (sets.length < min) return '세트를 1개 이상 입력해주세요.'
    if (sets.length > max) return `세트는 최대 ${max}개까지 등록할 수 있습니다.`
    for (const s of sets) {
        if (!isValidScore(s.me) || !isValidScore(s.opp)) return '세트 스코어를 올바르게 입력해주세요.'
        if (s.me === 0 && s.opp === 0) return '0-0 세트는 저장할 수 없습니다.'
        if (s.myAd != null && !['me', 'partner'].includes(s.myAd)) return '세트 애드 코트 값이 올바르지 않습니다.'
        if (s.oppAd != null && !['opponent', 'opponent2'].includes(s.oppAd)) return '세트 애드 코트 값이 올바르지 않습니다.'
    }
    return null
}

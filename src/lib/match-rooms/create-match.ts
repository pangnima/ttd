import type { CourtSurface, MatchRoomSourceKind, MatchType } from '@/types'
import { validateRoomPassword } from '@/lib/match-rooms/password'
import { validateCourtName } from '@/lib/personal-matches/validate-input'

/**
 * 「매칭 만들기」 입력 규칙 (순수 — Week 39).
 *
 * 0046~0064까지 방은 "이미 저장한 기록을 리스트에 노출"하는 부산물이었다. 이제는 반대다 —
 * **매칭(방)이 먼저 있고 경기 기록이 그 산출물**이다. 그래서 이 폼은 스코어를 받지 않는다:
 * 만들 때 정하는 것은 "언제·어디서·어떤 방식으로 칠 것인가"와 "누구를 부를 것인가"뿐이고,
 * 라인업과 결과는 룸 안에서 채워진다.
 *
 * 참가자를 비운 채 방부터 만드는 것은 기존 '모집형'(0047)이 이미 열어 둔 길이다 —
 * 단식·페어 복식은 참가자 없는 personal_matches 행을, 로테이션은 빈 풀 rotation_sessions 행을
 * seed로 삼아 create_match_room에 넘긴다.
 */

/**
 * 경기 방식 — DB의 source_kind(direct/rotation)와 match_type(단식/복식 3종)을 사용자 어휘로 합친 축.
 *
 * **복식은 곧 로테이션이다.** 페어를 고정한 복식을 따로 두지 않는 이유는, 빌더가 게임마다
 * 파트너·상대를 고르게 하므로 "매 게임 같은 파트너"가 그 특수 케이스이기 때문이다 —
 * 방식을 하나 더 두면 사용자는 시작 전에 페어를 바꿀지 말지부터 정해야 한다.
 */
export type MatchRoomFormat = 'singles' | 'doubles'

export const MATCH_ROOM_FORMATS: { value: MatchRoomFormat; label: string }[] = [
    { value: 'singles', label: '단식' },
    { value: 'doubles', label: '복식' },
]

export const DOUBLES_MATCH_TYPE_OPTIONS: { value: MatchType; label: string }[] = [
    { value: 'men_doubles', label: '남자 복식' },
    { value: 'women_doubles', label: '여자 복식' },
    { value: 'mixed_doubles', label: '혼합 복식' },
]

const DOUBLES_TYPES: MatchType[] = ['men_doubles', 'women_doubles', 'mixed_doubles']

/** 한 번에 부를 수 있는 인원 상한 — 정원 제한이 아니라 오조작·대량 초대 방지선이다 */
export const MATCH_ROOM_INVITE_MAX = 20

export type CreateMatchRoomInput = {
    format: MatchRoomFormat
    matchType: MatchType
    playedAt: string
    playedTime: string      // 'HH:MM' (시 단위)
    surface: CourtSurface
    courtName?: string
    /** 예정 소요 시간(분) — 종료 시각은 playedTime + 이 값 (0073) */
    durationMinutes: number
    /** 동시에 쓰는 코트 면 수 — 권장 경기 수 계산과 표시에만 쓴다 (0073) */
    courtCount: number
    notes?: string
    /** 리스트에서 발견한 회원이 입장할 때 쓰는 비밀번호. 초대받은 사람은 이걸 몰라도 수락으로 들어온다 */
    password: string
    /** 지목한 상대 — 방 생성 직후 invite_room_members(0065)로 초대된다 */
    inviteUserIds: string[]
}

/** 방식 → create_match_room의 출처 종류. 복식(=로테이션)만 세션을 seed로 쓴다 */
export function sourceKindOf(format: MatchRoomFormat): MatchRoomSourceKind {
    return format === 'doubles' ? 'rotation' : 'direct'
}

/** 방식을 바꿨을 때 기본으로 잡을 경기 타입 */
export function defaultMatchTypeOf(format: MatchRoomFormat): MatchType {
    return format === 'singles' ? 'singles' : 'men_doubles'
}

/** 방식과 경기 타입의 정합 — 단식은 singles 하나, 복식은 복식 3종 */
export function isMatchTypeAllowed(format: MatchRoomFormat, matchType: MatchType): boolean {
    return format === 'singles' ? matchType === 'singles' : DOUBLES_TYPES.includes(matchType)
}

/**
 * 방의 시간·면 수 검증 — DB CHECK(match_rooms.duration_minutes / court_count)의 거울.
 * 매칭 만들기와 직접 기록의 비노출 방(0082)이 같은 규칙을 쓴다.
 */
export function validateRoomSchedule(input: { durationMinutes: number; courtCount: number }): string | null {
    if (!(input.durationMinutes >= 30 && input.durationMinutes <= 600)) return '경기 시간을 선택해주세요.'
    if (!(input.courtCount >= 1 && input.courtCount <= 12)) return '코트 면 수를 선택해주세요.'
    return null
}

/**
 * 매칭 만들기 검증 — 폼 isValid와 서버 액션이 공유한다(클라·서버 동일 규칙).
 * 순서는 화면의 입력 순서를 따른다: 방식 → 일시 → 표면·코트 → 비밀번호 → 초대.
 */
export function validateCreateMatchRoomInput(input: CreateMatchRoomInput): string | null {
    if (!isMatchTypeAllowed(input.format, input.matchType)) return '경기 방식과 종목이 맞지 않습니다.'
    if (!input.playedAt) return '경기 날짜를 입력해주세요.'
    if (!/^\d{2}:\d{2}$/.test(input.playedTime)) return '경기 시각을 선택해주세요.'
    if (!input.surface) return '코트 표면을 선택해주세요.'
    const scheduleError = validateRoomSchedule(input)
    if (scheduleError) return scheduleError

    const courtNameError = validateCourtName(input.courtName)
    if (courtNameError) return courtNameError

    const passwordError = validateRoomPassword(input.password)
    if (passwordError) return passwordError

    if (input.inviteUserIds.length > MATCH_ROOM_INVITE_MAX) {
        return `한 번에 초대할 수 있는 인원은 ${MATCH_ROOM_INVITE_MAX}명까지입니다.`
    }
    if (new Set(input.inviteUserIds).size !== input.inviteUserIds.length) {
        return '같은 회원을 두 번 초대할 수 없습니다.'
    }
    return null
}

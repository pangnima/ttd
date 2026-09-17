import type { MatchType } from '@/types'
import { addMinutes } from '@/lib/match-games/form-mapping'
import { courtNeed } from '@/lib/match-games/lineup-core'
import { effectiveCourtCount } from '@/lib/match-rooms/court-slots'
import { gamesForPerPlayer, PER_PLAYER_OPTIONS, ROOM_LINEUP_MAX_GAMES } from '@/lib/match-rooms/lineup'

/**
 * 매칭 룸의 시간 계산 (순수 — Week 43).
 *
 * 방은 시작 시각과 **예정 소요 시간**을 안다. 종료를 시각으로 저장하지 않는 이유는 자정을 넘길 때
 * 종료 < 시작이 되어 계산이 꼬이기 때문이다 — 화면에는 어차피 `10:00~12:00`으로 환산해 보여준다.
 *
 * 여기서 나오는 권장값은 **1인당 경기 수**다. 자동 대진표가 그 축으로 조작되므로(gamesForPerPlayer),
 * 총 게임 수로 추천하면 "권장 8경기인데 지금 9경기" 같은 어긋남이 생긴다. 같은 어휘로 말하면
 * [적용] 뒤에 요약 줄의 총 경기 수가 저절로 맞는다.
 */

/** 예정 소요 시간 선택지 — 30분 간격. 기본은 2시간(가장 흔한 대관 단위) */
export const DURATION_OPTIONS = [60, 90, 120, 150, 180, 210, 240, 300, 360] as const
export const DEFAULT_DURATION_MINUTES = 120

/** 경기당 시간 선택지 — 클럽 대진표의 슬롯 길이(20·30·40·60)에 25·45를 더했다 */
export const SLOT_MINUTES_OPTIONS = [20, 25, 30, 40, 45, 60] as const
export const DEFAULT_SLOT_MINUTES = 30

/** 코트 면 수 선택지 */
export const COURT_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6] as const
export const DEFAULT_COURT_COUNT = 1

/** 분 → '2시간' · '1시간 30분' · '45분' */
export function formatDurationLabel(minutes: number): string {
    if (!Number.isFinite(minutes) || minutes <= 0) return ''
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h === 0) return `${m}분`
    if (m === 0) return `${h}시간`
    return `${h}시간 ${m}분`
}

/**
 * 방의 시간대 한 줄 — 소요 시간이 있으면 `10:00~12:00`, 없으면 기존과 같은 `10시`.
 *
 * `formatHourLabel`(lib/format.ts)을 쓰지 않는 이유는 그것이 분을 버리기 때문이다(`10:30` → `10시`).
 * 종료는 `12:30`이 될 수 있으므로 분을 살려야 하는데, 그 함수는 개인 경기 화면과 공유되어 고칠 수 없다.
 */
export function formatRoomWhen(playedTime?: string | null, durationMinutes?: number | null): string {
    const start = playedTime?.slice(0, 5)
    if (!start || !/^\d{2}:\d{2}$/.test(start)) return ''
    if (!durationMinutes || durationMinutes <= 0) return `${Number(start.slice(0, 2))}시`
    return `${start}~${addMinutes(start, durationMinutes)}`
}

/** 방의 시간 좌표 — 종료 시각을 알기 위한 최소 입력. `MatchRoomInvite`·`MatchRoomDetail.room`이 그대로 맞는다 */
export type RoomTimeInput = {
    playedAt: string
    playedTime?: string | null
    durationMinutes?: number | null
}

/** `YYYY-MM-DD` + `HH:MM`(KST)을 Date로 — 방의 시각은 전부 KST 로컬 값이다 */
function kstDate(playedAt: string, hhmm: string): Date {
    return new Date(`${playedAt}T${hhmm}:00+09:00`)
}

/** 시작 시각. 시각을 모르면 그날 00:00 KST — DB `room_start_at`(0094)의 거울 */
export function roomStartAt({ playedAt, playedTime }: RoomTimeInput): Date {
    return kstDate(playedAt, playedTime?.slice(0, 5) ?? '00:00')
}

/**
 * 종료 시각 — DB `room_end_at`(0094)의 거울. **규칙이 두 곳에 같아야 한다**(초대 만료 가드가 DB에, 목록 필터가 앱에 있다):
 * 시각을 모르는 방(레거시)은 다음날 00:00 KST(그날 전체), 소요 시간을 모르면 `DEFAULT_DURATION_MINUTES`.
 */
export function roomEndAt(input: RoomTimeInput): Date {
    if (!input.playedTime) {
        const next = kstDate(input.playedAt, '00:00')
        next.setUTCDate(next.getUTCDate() + 1)
        return next
    }
    const start = roomStartAt(input)
    return new Date(start.getTime() + (input.durationMinutes ?? DEFAULT_DURATION_MINUTES) * 60_000)
}

/** 초대가 만료됐나 — 매칭 종료 시각을 지나면 수락할 수 없다(DB `invite_expired` 가드의 거울, Week 71) */
export function isInviteExpired(input: RoomTimeInput, now: Date = new Date()): boolean {
    return roomEndAt(input).getTime() <= now.getTime()
}

export type RecommendInput = {
    durationMinutes?: number | null
    slotMinutes: number
    courtCount: number
    playerCount: number
    matchType: MatchType
}

export type LineupRecommendation = {
    /** 시간 안에 들어가는 순번 수 */
    rounds: number
    /** 실제로 돌릴 수 있는 면 수 — 인원이 모자라면 방의 면 수보다 작다 */
    courts: number
    /** 권장 총 경기 수 */
    games: number
    /** 권장 1인당 경기 수 — 자동 대진표가 조작하는 축 */
    perPlayer: number
    /** 왜 이 값인지, 또는 무엇이 걸렸는지 */
    notes: string[]
}

/**
 * 시간과 코트 면 수로 권장 경기 수를 낸다. 소요 시간을 모르는 방(0073 이전)은 `null` —
 * 그런 방에서는 추천 줄을 아예 그리지 않아 화면이 예전 그대로다.
 */
export function recommendGames(input: RecommendInput): LineupRecommendation | null {
    const { durationMinutes, slotMinutes, courtCount, playerCount, matchType } = input
    if (!durationMinutes || durationMinutes <= 0) return null
    if (slotMinutes <= 0 || courtCount <= 0) return null

    // 대진을 만들 수 없는 인원이면 권장값도 뜻이 없다 — buildRoomLineup의 게이트와 같은 눈높이.
    // 이걸 빼면 호스트 혼자 있는 방에서 '1인당 10경기' 같은 숫자가 나온다.
    const slots = courtNeed(matchType).size
    if (playerCount < slots) return null

    // 인원으로 실제 돌릴 수 있는 면 수를 쓴다. 방의 면 수를 그대로 곱하면 11명·3면 방에
    // "1인당 4경기"를 권하게 되는데, 11명으로는 세 번째 코트를 채울 수 없어 실제로는 예정 시간을 넘긴다.
    const courts = effectiveCourtCount(playerCount, matchType, courtCount)

    const notes: string[] = []
    let rounds = Math.floor(durationMinutes / slotMinutes)
    if (rounds < 1) {
        rounds = 1
        notes.push(`경기 시간이 예정 시간(${formatDurationLabel(durationMinutes)})보다 깁니다.`)
    }

    const capacity = rounds * courts
    if (capacity > ROOM_LINEUP_MAX_GAMES) {
        notes.push(`시간으로는 ${capacity}경기가 들어가지만 한 번에 만들 수 있는 경기는 ${ROOM_LINEUP_MAX_GAMES}개까지입니다.`)
    }

    // 1인당 경기 수에서 총 경기 수를 되짚어 **시간을 넘지 않는 가장 큰 값**을 고른다.
    // 산술로 환산(round(capacity × slots / playerCount))하면 gamesForPerPlayer의 반올림과 어긋나
    // "권장대로 적용했는데 예정 시간을 넘습니다"가 나온다 — 화면이 스스로를 반박하는 셈이다.
    const isDoubles = slots > 2
    let perPlayer = 1
    let games = gamesForPerPlayer(playerCount, 1, isDoubles)
    for (let candidate = PER_PLAYER_OPTIONS[PER_PLAYER_OPTIONS.length - 1]; candidate >= 1; candidate--) {
        const total = gamesForPerPlayer(playerCount, candidate, isDoubles)
        if (total <= capacity && estimateMinutes(total, slotMinutes, courts) <= durationMinutes) {
            perPlayer = candidate
            games = total
            break
        }
    }

    return { rounds, courts, games, perPlayer, notes }
}

export type DescribeRecommendationInput = {
    recommendation: LineupRecommendation
    /** 방이 고른 면 수 — 실효 면 수가 이보다 작으면 "M면 기준"을 밝힌다 */
    courtCount: number
    playerCount: number
}

/**
 * 권장값 한 문장 — 매칭 만들기 요약 줄과 룸 상세 힌트가 **같은 문장**을 쓴다(Week 47).
 * 고른 면 수와 실제로 돌릴 수 있는 면 수가 다르면 밝힌다 — 안 그러면 "3면인데 왜 4경기"가 된다.
 */
export function describeRecommendation({ recommendation, courtCount, playerCount }: DescribeRecommendationInput): string {
    const basisCourts = recommendation.courts < courtCount ? `${recommendation.courts}면 기준 ` : ''
    return `참가 예정 ${playerCount}명이면 ${basisCourts}1인당 ${recommendation.perPlayer}경기 권장`
}

/** 이 경기 수를 소화하는 데 걸리는 시간 — 코트 면 수만큼 동시에 돈다 */
export function estimateMinutes(games: number, slotMinutes: number, courtCount: number): number {
    if (games <= 0 || slotMinutes <= 0 || courtCount <= 0) return 0
    return Math.ceil(games / courtCount) * slotMinutes
}

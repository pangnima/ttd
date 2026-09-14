import type { CourtSurface, MatchType } from '@/types'
import { validateRoomSchedule } from '@/lib/match-rooms/create-match'
import { validateCourtName } from '@/lib/personal-matches/validate-input'

/**
 * 「직접 기록」의 경계 (순수 — Week 39 → Week 53).
 *
 * 회원이 한 명이라도 끼는 경기는 **반드시 매칭(방)을 거친다**. 상대에게도 남는 기록이므로
 * 동의와 결과 확인이 필요하고, 그 절차는 전부 매칭 룸 안에 있다.
 * 방 없는 직접 기록은 비회원(게스트)끼리 친 경기 — 확인받을 상대가 없어 내 기록에만 남는다.
 *
 * Week 39는 회원을 넣으면 폼을 막고 「매칭 만들기」로 보냈다. Week 53(0082)부터는 **그 자리에서 방을 만든다** —
 * 매칭 리스트에는 오르지 않는 비노출 방을 열어 회원은 초대하고 비회원은 명단에 등록한다.
 * 그러니 이 술어의 뜻은 "막는다"가 아니라 "어느 경로로 저장하는가"다: 참이면 방, 거짓이면 내 기록.
 *
 * DB에는 대응 가드가 없다 — 그래서 폼 검증과 서버 액션 **양쪽**이 이 함수를 봐야 한다.
 * 한쪽만 보면 그쪽이 곧 우회로가 된다(수정 액션이 그 구멍이었다 — N-2).
 */
export type DirectRecordPlayer = { userId?: string }

/** 회원이 한 명이라도 있으면 true — 그 경기는 매칭 룸(비노출 방)을 거친다 */
export function requiresRoom(players: ReadonlyArray<DirectRecordPlayer>): boolean {
    return players.some((p) => !!p.userId)
}

/** 서버가 방 밖 저장·수정에 회원이 섞인 것을 잡았을 때 — 신규는 폼이 방을 만들므로 정상 경로로는 오지 않는다 */
export const DIRECT_RECORD_MEMBER_ERROR =
    '회원과 함께 친 경기는 매칭으로 기록합니다. 직접 기록에서 회원을 고르면 매칭이 자동으로 만들어집니다.'

/** 직접 기록 폼의 참가자 한 명 — 회원이면 userId, 비회원이면 이름(과 손·NTRP)이 정체성이다 */
export type DirectRecordPlayerInput = {
    userId?: string
    name: string
    dominantHand?: 'right' | 'left'
    ntrp?: number
}

/** 비노출 방에 넣을 사람들 — 회원은 초대(invite_room_members), 비회원은 등록(add_room_guest) */
export type DirectRecordSplit = {
    memberIds: string[]
    guests: Array<{ name: string; dominantHand?: 'right' | 'left'; ntrp?: number }>
}

/**
 * 참가자를 회원·비회원으로 가른다. 회원은 같은 사람을 두 번 초대하지 않고,
 * 비회원은 이름이 비면 버린다(빈 슬롯은 사람이 아니다). 이름 중복은 방 안 유일 규칙(0069)이 잡는다.
 */
export function splitDirectPlayers(players: ReadonlyArray<DirectRecordPlayerInput>): DirectRecordSplit {
    const memberIds: string[] = []
    const guests: DirectRecordSplit['guests'] = []
    for (const p of players) {
        if (p.userId) {
            if (!memberIds.includes(p.userId)) memberIds.push(p.userId)
            continue
        }
        const name = p.name.trim()
        if (!name) continue
        guests.push({ name, dominantHand: p.dominantHand, ntrp: p.ntrp })
    }
    return { memberIds, guests }
}

/** 직접 기록 폼이 비노출 방을 만들 때 서버로 보내는 페이로드 */
export type DirectRecordRoomInput = {
    matchType: MatchType
    playedAt: string
    playedTime: string      // 'HH:MM'
    surface: CourtSurface
    courtName?: string
    notes?: string
    durationMinutes: number
    courtCount: number
    players: DirectRecordPlayerInput[]
}

/**
 * 비노출 방 생성 검증 — 폼 isValid와 서버 액션이 공유한다.
 * 회원이 한 명도 없으면 방을 만들 이유가 없다(그 경기는 내 기록으로 저장하는 경로다).
 */
export function validateDirectRecordRoomInput(input: DirectRecordRoomInput): string | null {
    if (!requiresRoom(input.players)) return '회원이 없는 경기는 매칭 없이 내 기록으로 저장됩니다.'
    if (!input.playedAt) return '경기 날짜를 입력해주세요.'
    if (!/^\d{2}:\d{2}$/.test(input.playedTime)) return '경기 시각을 선택해주세요.'
    if (!input.surface) return '코트 표면을 선택해주세요.'
    const scheduleError = validateRoomSchedule(input)
    if (scheduleError) return scheduleError
    const courtNameError = validateCourtName(input.courtName)
    if (courtNameError) return courtNameError
    return null
}

import type { MatchType } from '@/types'
import { formatShortDate } from '@/lib/format'
import { formatRoomWhen } from '@/lib/match-rooms/schedule'
import { MATCH_TYPE_LABELS } from '@/lib/dashboard/match-type-style'

export type RoomTitleInput = {
    playedAt: string
    playedTime?: string
    /** 있으면 제목이 '10:00~12:00'으로 구간을 말한다 (0073) */
    durationMinutes?: number
    courtName?: string
    matchType: MatchType
}

/**
 * 방 자동 제목 — "9월 12일 18시 · 올림픽공원 3번 코트 · 남자 복식".
 * 방에는 제목 필드가 없으므로(사용자 결정) 일시·코트명·경기 타입으로 조합한다. 코트명·시각은 없으면 생략.
 */
export function buildRoomTitle({ playedAt, playedTime, durationMinutes, courtName, matchType }: RoomTitleInput): string {
    const date = formatShortDate(playedAt)
    const hours = formatRoomWhen(playedTime, durationMinutes)
    const when = hours ? `${date} ${hours}` : date
    const court = courtName?.trim() || null
    return [when, court, MATCH_TYPE_LABELS[matchType]].filter((s): s is string => !!s).join(' · ')
}

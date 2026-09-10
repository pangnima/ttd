'use client'

import { useState } from 'react'
import type { CourtSurface, MatchType } from '@/types'
import {
    defaultMatchTypeOf,
    validateCreateMatchRoomInput,
    type CreateMatchRoomInput,
    type MatchRoomFormat,
} from '@/lib/match-rooms/create-match'
import { todayIsoKst } from '@/lib/match-rooms/split'
import { DEFAULT_COURT_COUNT, DEFAULT_DURATION_MINUTES } from '@/lib/match-rooms/schedule'

/** 초대 대상 1명 — 회원만 담긴다(게스트는 방에 들어올 수 없다) */
export type InviteeRow = { userId: string; name: string; meta?: string }

/**
 * 「매칭 만들기」 폼 state + 파생값.
 * 검증은 화면과 서버가 같은 순수 함수(validateCreateMatchRoomInput)를 쓴다 — 규칙이 두 벌 생기지 않게.
 */
export function useMatchRoomFormState() {
    const [format, setFormatState] = useState<MatchRoomFormat>('singles')
    const [matchType, setMatchType] = useState<MatchType>('singles')
    const [playedAt, setPlayedAt] = useState(todayIsoKst())
    const [playedTime, setPlayedTime] = useState('')
    const [surface, setSurface] = useState<CourtSurface | ''>('')
    const [courtName, setCourtName] = useState('')
    const [durationMinutes, setDurationMinutes] = useState<number>(DEFAULT_DURATION_MINUTES)
    const [courtCount, setCourtCount] = useState<number>(DEFAULT_COURT_COUNT)
    const [notes, setNotes] = useState('')
    const [password, setPassword] = useState('')
    const [invitees, setInvitees] = useState<InviteeRow[]>([])

    // 방식을 바꾸면 종목도 함께 옮긴다 — 단식↔복식이 어긋난 채로 남지 않도록
    function setFormat(next: MatchRoomFormat) {
        setFormatState(next)
        setMatchType((prev) => (next === 'singles' || prev === 'singles' ? defaultMatchTypeOf(next) : prev))
    }

    function addInvitee(row: InviteeRow) {
        setInvitees((prev) => (prev.some((r) => r.userId === row.userId) ? prev : [...prev, row]))
    }
    function removeInvitee(userId: string) {
        setInvitees((prev) => prev.filter((r) => r.userId !== userId))
    }

    function buildInput(): CreateMatchRoomInput {
        return {
            format,
            matchType,
            playedAt,
            playedTime,
            surface: surface as CourtSurface,
            courtName: courtName.trim() || undefined,
            durationMinutes,
            courtCount,
            notes: notes.trim() || undefined,
            password,
            inviteUserIds: invitees.map((r) => r.userId),
        }
    }

    return {
        format, setFormat, matchType, setMatchType,
        playedAt, setPlayedAt, playedTime, setPlayedTime,
        surface, setSurface, courtName, setCourtName, notes, setNotes,
        durationMinutes, setDurationMinutes, courtCount, setCourtCount,
        password, setPassword,
        invitees, addInvitee, removeInvitee,
        isValid: !!surface && validateCreateMatchRoomInput(buildInput()) === null,
        buildInput,
    }
}

export type MatchRoomFormState = ReturnType<typeof useMatchRoomFormState>

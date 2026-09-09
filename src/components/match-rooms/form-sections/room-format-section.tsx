'use client'

import type { MatchType } from '@/types'
import {
    DOUBLES_MATCH_TYPE_OPTIONS,
    MATCH_ROOM_FORMATS,
    type MatchRoomFormat,
} from '@/lib/match-rooms/create-match'
import { FieldToggle } from '@/components/common/field-toggle'

type Props = {
    format: MatchRoomFormat
    onFormatChange: (v: MatchRoomFormat) => void
    matchType: MatchType
    onMatchTypeChange: (v: MatchType) => void
}

const FORMAT_HINT: Record<MatchRoomFormat, string> = {
    singles: '1대1. 룸에서 상대를 골라 게임을 등록합니다.',
    doubles: '페어를 고정하고 칩니다. 룸에서 파트너·상대팀을 지정해 게임을 등록합니다.',
    rotation: '파트너를 바꿔 가며 칩니다. 참가자가 모이면 룸에서 게임을 한 번에 구성합니다.',
}

/** 경기 방식 — 방식이 곧 방의 출처 종류(direct/rotation)와 종목을 정한다 */
export function RoomFormatSection({ format, onFormatChange, matchType, onMatchTypeChange }: Props) {
    return (
        <div className="space-y-4">
            <div>
                <FieldToggle
                    label="경기 방식"
                    required
                    options={MATCH_ROOM_FORMATS}
                    value={format}
                    onChange={onFormatChange}
                />
                <p className="mt-2 text-caption text-muted-foreground break-keep">{FORMAT_HINT[format]}</p>
            </div>
            {format !== 'singles' && (
                <FieldToggle
                    label="종목"
                    required
                    options={DOUBLES_MATCH_TYPE_OPTIONS}
                    value={matchType}
                    onChange={onMatchTypeChange}
                />
            )}
        </div>
    )
}

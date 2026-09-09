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
    doubles: '참가자가 모이면 룸에서 게임마다 파트너·상대를 골라 한 번에 구성합니다. 매 게임 같은 파트너로 쳐도 됩니다.',
}

/** 경기 방식 — 방식이 곧 방의 출처 종류(direct/rotation)와 종목을 정한다. 복식은 곧 로테이션이다 */
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

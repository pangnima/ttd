'use client'

import type { ReactNode } from 'react'
import type { CourtSurface } from '@/types'
import { SURFACE_OPTIONS } from '@/lib/dashboard/surface'
import { FieldToggle } from '@/components/common/field-toggle'
import { EnumSelect } from '@/components/match/enum-select'
import { CourtNameAutocomplete } from '@/components/personal-matches/court-name-autocomplete'
import { MATCH_FORM_FIELD_HEIGHT, MATCH_FORM_INPUT, MATCH_FORM_LABEL, MATCH_FORM_SELECT_TRIGGER } from '@/lib/dashboard/tokens'
import { HOUR_OPTIONS } from '@/lib/format'

type MatchMetaSectionProps = {
    playedAt: string
    onPlayedAtChange: (v: string) => void
    playedTime: string
    onPlayedTimeChange: (v: string) => void
    surface: CourtSurface | ''
    onSurfaceChange: (v: CourtSurface) => void
    courtName: string
    onCourtNameChange: (v: string) => void
    recentCourtNames: string[]
    /**
     * 날짜·시각과 **같은 줄**에 이어 붙일 필드들(매칭 만들기의 경기 시간·코트 면 수).
     * 방의 시간 축은 "언제부터 몇 시간, 몇 면"이 하나의 사실이라 네 조각으로 흩어지면 읽히지 않는다.
     * 넘기지 않으면 개인 경기 폼은 지금과 똑같이 2열이다.
     */
    scheduleExtra?: ReactNode
}

/**
 * 경기 메타 정보 — 날짜·시각(시 단위 셀렉트)·코트 표면(라디오형 FieldToggle)·코트명(선택, 최근 코트 재선택).
 * 시각은 시만 받는다(네이티브 time 피커는 모바일에서 step을 무시해 분이 노출되므로 셀렉트로 고정).
 */
export function MatchMetaSection({
    playedAt, onPlayedAtChange, playedTime, onPlayedTimeChange, surface, onSurfaceChange,
    courtName, onCourtNameChange, recentCourtNames, scheduleExtra,
}: MatchMetaSectionProps) {
    return (
        <>
            <div className={`grid grid-cols-2 gap-3${scheduleExtra ? ' sm:grid-cols-4' : ''}`}>
                <div>
                    <label className={MATCH_FORM_LABEL}>경기 날짜 *</label>
                    <input
                        type="date"
                        value={playedAt}
                        onChange={(e) => onPlayedAtChange(e.target.value)}
                        className={`${MATCH_FORM_INPUT} ${MATCH_FORM_FIELD_HEIGHT}`}
                        required
                    />
                </div>
                <div>
                    <label className={MATCH_FORM_LABEL}>경기 시각 *</label>
                    <EnumSelect
                        value={playedTime}
                        onValueChange={onPlayedTimeChange}
                        options={HOUR_OPTIONS}
                        placeholder="시각 선택"
                        ariaLabel="경기 시각"
                        triggerClassName={MATCH_FORM_SELECT_TRIGGER}
                    />
                </div>
                {scheduleExtra}
            </div>
            <div>
                <FieldToggle
                    label="코트 표면"
                    required
                    options={SURFACE_OPTIONS}
                    value={surface || undefined}
                    onChange={onSurfaceChange}
                />
                <p className="mt-2 text-caption text-muted-foreground">선수별 NTRP는 개인 레이팅(NTRP) 계산에 사용됩니다.</p>
            </div>
            <div>
                <label className={MATCH_FORM_LABEL}>코트명 (선택)</label>
                <CourtNameAutocomplete
                    value={courtName}
                    recentCourtNames={recentCourtNames}
                    onChange={onCourtNameChange}
                    placeholder="예: 올림픽공원 3번 코트"
                />
            </div>
        </>
    )
}

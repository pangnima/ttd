'use client'

import type { CourtSurface } from '@/types'
import { SURFACE_OPTIONS } from '@/lib/dashboard/surface'
import { FieldToggle } from '@/components/common/field-toggle'
import { EnumSelect } from '@/components/match/enum-select'
import { CourtNameAutocomplete } from '@/components/personal-matches/court-name-autocomplete'
import { MATCH_FORM_INPUT, MATCH_FORM_LABEL } from '@/lib/dashboard/tokens'
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
}

// 날짜 input과 시각 셀렉트 트리거를 같은 높이로 고정 (MATCH_FORM_INPUT은 textarea 공용이라 토큰에는 높이를 두지 않는다)
const FIELD_HEIGHT = 'h-12'
const HOUR_TRIGGER_CLASS =
    `w-full ${FIELD_HEIGHT} data-[size=default]:${FIELD_HEIGHT} rounded-lg px-3 text-body bg-background dark:bg-input/30 border-input focus:border-ring`

/**
 * 경기 메타 정보 — 날짜·시각(시 단위 셀렉트)·코트 표면(라디오형 FieldToggle)·코트명(선택, 최근 코트 재선택).
 * 시각은 시만 받는다(네이티브 time 피커는 모바일에서 step을 무시해 분이 노출되므로 셀렉트로 고정).
 */
export function MatchMetaSection({
    playedAt, onPlayedAtChange, playedTime, onPlayedTimeChange, surface, onSurfaceChange,
    courtName, onCourtNameChange, recentCourtNames,
}: MatchMetaSectionProps) {
    return (
        <>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={MATCH_FORM_LABEL}>경기 날짜 *</label>
                    <input
                        type="date"
                        value={playedAt}
                        onChange={(e) => onPlayedAtChange(e.target.value)}
                        className={`${MATCH_FORM_INPUT} ${FIELD_HEIGHT}`}
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
                        triggerClassName={HOUR_TRIGGER_CLASS}
                    />
                </div>
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

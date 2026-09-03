'use client'

import type { CourtSurface } from '@/types'
import { SURFACE_OPTIONS } from '@/lib/dashboard/surface'
import { FieldToggle } from '@/components/common/field-toggle'
import { MATCH_FORM_INPUT, MATCH_FORM_LABEL } from '@/lib/dashboard/tokens'
import { roundToHalfHour } from '@/lib/format'

type MatchMetaSectionProps = {
    playedAt: string
    onPlayedAtChange: (v: string) => void
    playedTime: string
    onPlayedTimeChange: (v: string) => void
    surface: CourtSurface | ''
    onSurfaceChange: (v: CourtSurface) => void
}

/**
 * 경기 메타 정보 — 날짜·시각·코트 표면(라디오형 FieldToggle).
 * 향후 경기 장소/코트명 등 위치 정보 필드를 이 섹션에 추가한다.
 */
export function MatchMetaSection({
    playedAt, onPlayedAtChange, playedTime, onPlayedTimeChange, surface, onSurfaceChange,
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
                        className={MATCH_FORM_INPUT}
                        required
                    />
                </div>
                <div>
                    <label className={MATCH_FORM_LABEL}>경기 시각 *</label>
                    <input
                        type="time"
                        step={1800}
                        value={playedTime}
                        onChange={(e) => onPlayedTimeChange(e.target.value)}
                        // 직접 타이핑 등으로 30분에서 벗어난 값은 포커스 해제 시 30분 단위로 정리
                        onBlur={(e) => onPlayedTimeChange(roundToHalfHour(e.target.value))}
                        className={MATCH_FORM_INPUT}
                        required
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
        </>
    )
}

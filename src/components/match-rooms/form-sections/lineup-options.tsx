'use client'

import type { ReactNode } from 'react'

import type { OpponentCandidate } from '@/lib/queries/users'
import { LINEUP_PRESETS, type LineupPreset } from '@/lib/match-rooms/lineup'
import { TYPO } from '@/lib/dashboard/tokens'
import { FieldToggle } from '@/components/common/field-toggle'
import { LineupCountFields } from '@/components/match-rooms/form-sections/lineup-count-fields'
import { LineupParticipantChips } from '@/components/match-rooms/form-sections/lineup-participant-chips'

type Props = {
    candidates: OpponentCandidate[]
    included: Set<string>
    onToggle: (id: string) => void
    perPlayer: number
    onPerPlayerChange: (n: number) => void
    /** 경기당 시간(분) — 권장 경기 수의 분모 */
    slotMinutes: number
    onSlotMinutesChange: (n: number) => void
    /** 권장 1인당 경기 수 — 드롭다운의 그 항목에 「권장」이 붙는다. 방이 소요 시간을 모르면 없다 */
    recommendedPerPlayer?: number
    /** 권장 줄 — 방이 소요 시간을 모르면 넘어오지 않는다 */
    recommendation?: ReactNode
    preset: LineupPreset
    onPresetChange: (p: LineupPreset) => void
    gameCount: number
    /** 접으면 요약 한 줄만 남고 미리보기가 화면을 채운다 */
    open: boolean
    onOpenChange: (open: boolean) => void
}

/**
 * 대진 옵션 — 누가 뛰는지 · 1인당 몇 경기 · 어떤 기준으로 섞을지.
 * 요약 줄이 항상 위에 남아, 접은 상태에서도 무엇으로 뽑은 대진인지 알 수 있다.
 */
export function LineupOptions({
    candidates, included, onToggle, perPlayer, onPerPlayerChange, slotMinutes, onSlotMinutesChange,
    recommendedPerPlayer, preset, onPresetChange, gameCount, recommendation, open, onOpenChange,
}: Props) {
    const active = LINEUP_PRESETS.find((p) => p.value === preset)

    return (
        <div className="space-y-3">
            <div className="flex items-baseline justify-between gap-2">
                <p className={`${TYPO.body2} font-medium break-keep`}>
                    참가자 {included.size}명 · 1인당 {perPlayer}경기 · {active?.label}
                    <span className="text-muted-foreground"> → 총 {gameCount}경기</span>
                </p>
                <button
                    type="button"
                    onClick={() => onOpenChange(!open)}
                    className={`${TYPO.caption} text-primary shrink-0 hover:underline`}
                >
                    {open ? '옵션 접기' : '옵션 열기'}
                </button>
            </div>

            {recommendation}

            {open && (
                <div className="space-y-4">
                    <LineupParticipantChips candidates={candidates} included={included} onToggle={onToggle} />

                    <LineupCountFields
                        perPlayer={perPlayer}
                        onPerPlayerChange={onPerPlayerChange}
                        slotMinutes={slotMinutes}
                        onSlotMinutesChange={onSlotMinutesChange}
                        recommendedPerPlayer={recommendedPerPlayer}
                    />

                    <div>
                        <FieldToggle
                            label="밸런스 기준"
                            required
                            options={LINEUP_PRESETS}
                            value={preset}
                            onChange={onPresetChange}
                            columns={3}
                        />
                        {active && <p className={`mt-2 ${TYPO.caption} break-keep`}>{active.hint}</p>}
                    </div>
                </div>
            )}
        </div>
    )
}

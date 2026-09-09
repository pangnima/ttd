'use client'

import type { OpponentCandidate } from '@/lib/queries/users'
import { LINEUP_PRESETS, PER_PLAYER_OPTIONS, type LineupPreset } from '@/lib/match-rooms/lineup'
import { TYPO } from '@/lib/dashboard/tokens'
import { FieldToggle } from '@/components/common/field-toggle'
import { LineupParticipantChips } from '@/components/match-rooms/form-sections/lineup-participant-chips'

type Props = {
    candidates: OpponentCandidate[]
    included: Set<string>
    onToggle: (id: string) => void
    perPlayer: number
    onPerPlayerChange: (n: number) => void
    preset: LineupPreset
    onPresetChange: (p: LineupPreset) => void
    gameCount: number
    /** 접으면 요약 한 줄만 남고 미리보기가 화면을 채운다 */
    open: boolean
    onOpenChange: (open: boolean) => void
}

const PER_PLAYER_TOGGLE = PER_PLAYER_OPTIONS.map((n) => ({ value: String(n), label: `${n}경기` }))

/**
 * 대진 옵션 — 누가 뛰는지 · 1인당 몇 경기 · 어떤 기준으로 섞을지.
 * 요약 줄이 항상 위에 남아, 접은 상태에서도 무엇으로 뽑은 대진인지 알 수 있다.
 */
export function LineupOptions({
    candidates, included, onToggle, perPlayer, onPerPlayerChange, preset, onPresetChange, gameCount,
    open, onOpenChange,
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

            {open && (
                <div className="space-y-4">
                    <LineupParticipantChips candidates={candidates} included={included} onToggle={onToggle} />

                    <div className="grid gap-4 sm:grid-cols-2">
                        <FieldToggle
                            label="1인당 경기 수"
                            required
                            options={PER_PLAYER_TOGGLE}
                            value={String(perPlayer)}
                            onChange={(v) => onPerPlayerChange(Number(v))}
                            columns={3}
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
                </div>
            )}
        </div>
    )
}

'use client'

import type { OpponentCandidate } from '@/lib/queries/users'
import { LINEUP_PRESETS, PER_PLAYER_OPTIONS, type LineupPreset } from '@/lib/match-rooms/lineup'
import { MATCH_FORM_LABEL, TYPO } from '@/lib/dashboard/tokens'
import { EnumSelect } from '@/components/match/enum-select'
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

// base-ui Select는 items 참조로 라벨을 찾으므로 모듈 상수로 고정한다(렌더마다 새 배열이면 매핑이 흔들린다)
const PER_PLAYER_ITEMS = PER_PLAYER_OPTIONS.map((n) => ({ value: String(n), label: `${n}경기` }))

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
                        <div>
                            <label className={MATCH_FORM_LABEL}>1인당 경기 수 *</label>
                            <EnumSelect
                                value={String(perPlayer)}
                                onValueChange={(v) => onPerPlayerChange(Number(v))}
                                options={PER_PLAYER_ITEMS}
                                ariaLabel="1인당 경기 수"
                            />
                            <p className={`mt-2 ${TYPO.caption} break-keep`}>
                                덜 뛴 사람이 먼저 들어갑니다. 출전 편차는 1 이내입니다.
                            </p>
                        </div>
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

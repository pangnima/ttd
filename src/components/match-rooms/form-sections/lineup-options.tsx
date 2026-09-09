'use client'

import type { OpponentCandidate } from '@/lib/queries/users'
import { LINEUP_PRESETS, PER_PLAYER_OPTIONS, type LineupPreset } from '@/lib/match-rooms/lineup'
import { MATCH_FORM_LABEL, PILL_BASE, TYPO } from '@/lib/dashboard/tokens'
import { FieldToggle } from '@/components/common/field-toggle'

type Props = {
    candidates: OpponentCandidate[]
    included: Set<string>
    onToggle: (id: string) => void
    perPlayer: number
    onPerPlayerChange: (n: number) => void
    preset: LineupPreset
    onPresetChange: (p: LineupPreset) => void
    gameCount: number
}

const PER_PLAYER_TOGGLE = PER_PLAYER_OPTIONS.map((n) => ({ value: String(n), label: `${n}경기` }))

/** 대진 옵션 — 누가 뛰는지 · 1인당 몇 경기 · 어떤 기준으로 섞을지 */
export function LineupOptions({
    candidates, included, onToggle, perPlayer, onPerPlayerChange, preset, onPresetChange, gameCount,
}: Props) {
    const hint = LINEUP_PRESETS.find((p) => p.value === preset)?.hint

    return (
        <div className="space-y-4">
            <div>
                <label className={MATCH_FORM_LABEL}>참가자 ({included.size}명)</label>
                <ul className="flex flex-wrap gap-1.5">
                    {candidates.map((c) => {
                        const on = included.has(c.id)
                        return (
                            <li key={c.id}>
                                <button
                                    type="button"
                                    aria-pressed={on}
                                    onClick={() => onToggle(c.id)}
                                    className={`${PILL_BASE} transition-colors ${
                                        on
                                            ? 'border-primary/40 text-primary hover:bg-primary/10'
                                            : 'border-border text-muted-foreground line-through hover:bg-muted/50'
                                    }`}
                                >
                                    {c.name}
                                </button>
                            </li>
                        )
                    })}
                </ul>
                <p className={`mt-2 ${TYPO.caption} break-keep`}>
                    이름을 눌러 이번 대진에서 빼거나 다시 넣을 수 있습니다.
                </p>
            </div>

            <div>
                <FieldToggle
                    label="1인당 경기 수"
                    required
                    options={PER_PLAYER_TOGGLE}
                    value={String(perPlayer)}
                    onChange={(v) => onPerPlayerChange(Number(v))}
                    columns={3}
                />
                <p className={`mt-2 ${TYPO.caption} break-keep`}>총 {gameCount}경기를 만듭니다.</p>
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
                {hint && <p className={`mt-2 ${TYPO.caption} break-keep`}>{hint}</p>}
            </div>
        </div>
    )
}

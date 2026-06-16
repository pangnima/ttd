'use client'

import type { OpponentCandidate } from '@/lib/queries/users'
import type { PastOpponent } from '@/lib/queries/personal-matches'
import { PlayerPicker, type PlayerPickerValue } from '@/components/personal-matches/player-picker'
import { MATCH_FORM_INPUT as inputClass } from '@/lib/dashboard/tokens'

type Props = {
    label: string
    candidates: OpponentCandidate[]
    pastOpponents?: PastOpponent[]
    player: PlayerPickerValue
    onPlayerChange: (v: PlayerPickerValue) => void
    ntrp: string
    onNtrpChange: (v: string) => void
    ntrpRequired?: boolean
    placeholder?: string
}

/**
 * 선수 선택(PlayerPicker) + 그 선수의 추정 NTRP 입력을 묶은 필드.
 * 클럽 회원을 고르면 그 회원의 ntrp를 NTRP에 자동 프리필한다(이후 편집 가능).
 */
export function PlayerNtrpField({
    label,
    candidates,
    pastOpponents = [],
    player,
    onPlayerChange,
    ntrp,
    onNtrpChange,
    ntrpRequired = false,
    placeholder,
}: Props) {
    function handlePlayerChange(next: PlayerPickerValue) {
        onPlayerChange(next)
        // 회원 선택 시 NTRP 자동 프리필 — 동적 개인 NTRP 우선, 없으면 정적 자가선언 NTRP.
        if (next.userId) {
            const c = candidates.find((cand) => cand.id === next.userId)
            const prefill = c?.personalNtrp ?? c?.ntrp
            if (prefill) onNtrpChange(String(Number(prefill.toFixed(3))))
        }
    }

    return (
        <div className="space-y-2">
            <PlayerPicker
                label={label}
                candidates={candidates}
                pastOpponents={pastOpponents}
                value={player}
                onChange={handlePlayerChange}
                placeholder={placeholder}
            />
            <div>
                <label className="text-xs text-muted-foreground block mb-1">
                    NTRP{ntrpRequired ? ' *' : ' (선택)'}
                </label>
                <input
                    type="number"
                    step="any"
                    min={1}
                    max={7}
                    value={ntrp}
                    onChange={(e) => onNtrpChange(e.target.value)}
                    placeholder="예: 2.439"
                    className={inputClass}
                    required={ntrpRequired}
                />
            </div>
        </div>
    )
}

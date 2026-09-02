'use client'

import type { OpponentCandidate } from '@/lib/queries/users'
import type { PastOpponent } from '@/lib/queries/personal-matches'
import type { PlayerSuggestion } from '@/lib/personal-matches/player-suggestions'
import { PlayerPicker, type PlayerPickerValue } from '@/components/personal-matches/player-picker'
import { MATCH_FORM_INPUT as inputClass, MATCH_FORM_LABEL } from '@/lib/dashboard/tokens'

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
    // 상호 확인 요청 플로우 — 상대 NTRP는 수락 시 서버가 파생하므로 입력란을 숨긴다
    hideNtrp?: boolean
    // 플랫폼 전체 회원 검색 (선택) — PlayerPicker로 그대로 전달
    searchResults?: OpponentCandidate[]
    onSearchTermChange?: (term: string) => void
}

/**
 * 선수 자동완성(PlayerPicker) + 그 선수의 추정 NTRP 입력을 묶은 필드.
 * 후보(회원·만나본 사람)를 고르면 그 항목의 NTRP를 자동 프리필한다(이후 편집 가능).
 * 회원은 동적 개인 NTRP 우선, 없으면 자가선언 NTRP. 만나본 사람은 마지막에 입력한 NTRP.
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
    hideNtrp = false,
    searchResults,
    onSearchTermChange,
}: Props) {
    function handlePlayerChange(next: PlayerPickerValue, picked?: PlayerSuggestion) {
        onPlayerChange(next)
        if (picked?.ntrp != null) onNtrpChange(String(Number(picked.ntrp.toFixed(3))))
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
                searchResults={searchResults}
                onSearchTermChange={onSearchTermChange}
            />
            {!hideNtrp && (
                <div>
                    <label className={MATCH_FORM_LABEL}>
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
            )}
        </div>
    )
}

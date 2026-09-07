'use client'

import { Lock } from 'lucide-react'
import type { OpponentCandidate } from '@/lib/queries/users'
import type { PastOpponent } from '@/lib/queries/personal-matches'
import type { PlayerSuggestion } from '@/lib/personal-matches/player-suggestions'
import { PlayerPicker, type PlayerPickerValue } from '@/components/personal-matches/player-picker'
import { MATCH_FORM_INPUT as inputClass, MATCH_FORM_LABEL } from '@/lib/dashboard/tokens'
import { cn } from '@/lib/utils'

type Props = {
    label: string
    candidates: OpponentCandidate[]
    pastOpponents?: PastOpponent[]
    // 매칭 리스트 방 참가자 — 자동완성 최상단 그룹 (방 게임 구성·모집형 채우기)
    roomParticipants?: OpponentCandidate[]
    player: PlayerPickerValue
    onPlayerChange: (v: PlayerPickerValue) => void
    ntrp: string
    onNtrpChange: (v: string) => void
    ntrpRequired?: boolean
    placeholder?: string
    // 회원 슬롯 — NTRP는 그 회원의 프로필에서 파생되는 값이라 보여주되 편집시키지 않는다 (isNtrpLocked)
    ntrpLocked?: boolean
    // 플랫폼 전체 회원 검색 (선택) — PlayerPicker로 그대로 전달
    searchSelfUserId?: string
}

/**
 * 선수 자동완성(PlayerPicker) + 그 선수의 추정 NTRP 입력을 묶은 필드.
 * 후보(회원·만나본 사람)를 고르면 그 항목의 NTRP를 자동 프리필한다.
 * 회원은 프로필 파생값(derivePublicNtrp)이라 읽기 전용으로 보여주고, 비회원만 직접 입력·수정한다.
 */
export function PlayerNtrpField({
    label,
    candidates,
    pastOpponents = [],
    roomParticipants,
    player,
    onPlayerChange,
    ntrp,
    onNtrpChange,
    ntrpRequired = false,
    placeholder,
    ntrpLocked = false,
    searchSelfUserId,
}: Props) {
    function handlePlayerChange(next: PlayerPickerValue, picked?: PlayerSuggestion) {
        onPlayerChange(next)
        // 선수가 바뀌면 NTRP도 그 선수의 값으로 갈아끼운다 — 값이 없는 후보를 고르거나
        // 회원을 직접 입력으로 되돌릴 때 앞 선수의 값이 남아 저장되는 것을 막는다.
        if (picked) onNtrpChange(picked.ntrp != null ? String(Number(picked.ntrp.toFixed(3))) : '')
        else if (player.userId && !next.userId) onNtrpChange('')
    }

    return (
        <div className="space-y-2">
            <PlayerPicker
                label={label}
                candidates={candidates}
                pastOpponents={pastOpponents}
                roomParticipants={roomParticipants}
                value={player}
                onChange={handlePlayerChange}
                placeholder={placeholder}
                searchSelfUserId={searchSelfUserId}
            />
            <div>
                <label className={MATCH_FORM_LABEL}>
                    NTRP{ntrpLocked ? '' : ntrpRequired ? ' *' : ' (선택)'}
                </label>
                <div className="relative">
                    <input
                        type="number"
                        step="any"
                        min={1}
                        max={7}
                        value={ntrp}
                        onChange={(e) => onNtrpChange(e.target.value)}
                        placeholder="예: 2.439"
                        className={cn(inputClass, ntrpLocked && 'bg-muted text-muted-foreground pr-10')}
                        required={ntrpRequired && !ntrpLocked}
                        readOnly={ntrpLocked}
                        aria-readonly={ntrpLocked}
                    />
                    {ntrpLocked && (
                        <Lock className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    )}
                </div>
                {ntrpLocked && (
                    <p className="text-caption text-muted-foreground mt-1.5">
                        회원 NTRP는 프로필에서 자동 반영됩니다
                    </p>
                )}
            </div>
        </div>
    )
}

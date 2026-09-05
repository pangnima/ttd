'use client'

import { useMemo } from 'react'
import type { OpponentCandidate } from '@/lib/queries/users'
import type { PastOpponent } from '@/lib/queries/personal-matches'
import { buildPlayerSuggestionGroups, type PlayerSuggestion } from '@/lib/personal-matches/player-suggestions'
import { MATCH_FORM_LABEL } from '@/lib/dashboard/tokens'
import { FieldToggle } from '@/components/common/field-toggle'
import { PlayerAutocomplete } from '@/components/personal-matches/player-autocomplete'
import { useUserSearch } from '@/components/personal-matches/use-user-search'

type Hand = 'right' | 'left' | ''

const HAND_OPTIONS: { value: 'right' | 'left'; label: string }[] = [
    { value: 'right', label: '오른손' },
    { value: 'left', label: '왼손' },
]

export type PlayerPickerValue = {
    userId?: string
    name: string
    hand: Hand
}

type Props = {
    label: string
    candidates: OpponentCandidate[]
    pastOpponents?: PastOpponent[]
    // 매칭 리스트 방 참가자 — 최상단 '방 참가자' 그룹 (방 게임 구성·모집형 채우기에서만 전달)
    roomParticipants?: OpponentCandidate[]
    value: PlayerPickerValue
    // picked: 후보를 골랐을 때 그 항목 (NTRP 프리필용). 타이핑이면 undefined
    onChange: (value: PlayerPickerValue, picked?: PlayerSuggestion) => void
    placeholder?: string
    showHand?: boolean
    // 플랫폼 전체 회원 검색 — 로그인 유저 id를 주면 이 필드 안에서 디바운스 검색해 "전체 회원" 그룹을 붙인다.
    // 필드마다 독립된 검색 상태를 가지므로 복식 3필드·로테이션 풀 행이 서로 간섭하지 않는다.
    searchSelfUserId?: string
}

/**
 * 개인 경기 선수(상대/파트너) 입력 — 단일 자동완성 입력 + 손잡이.
 * 이름을 타이핑하면 [만나본 사람 / 클럽 회원 / 전체 회원] 후보가 뜨고, 고르면 userId·손잡이(·NTRP)가 채워진다.
 * 고르지 않으면 입력한 이름 그대로 게스트로 저장된다. 이름을 다시 수정하면 회원 연결이 해제된다.
 * 손잡이는 항상 노출 — 게스트는 필수, 회원은 프로필 값이 자동 채워지며 수정 가능.
 */
export function PlayerPicker({
    label, candidates, pastOpponents = [], roomParticipants, value, onChange, placeholder, showHand = true, searchSelfUserId,
}: Props) {
    const search = useUserSearch(searchSelfUserId)
    const searchResults = searchSelfUserId ? search.results : undefined
    const groups = useMemo(
        () => buildPlayerSuggestionGroups(value.name, { pastOpponents, candidates, searchResults, roomParticipants }),
        [value.name, pastOpponents, candidates, searchResults, roomParticipants],
    )
    const linked = value.userId
        ? roomParticipants?.find((c) => c.id === value.userId)
            ?? candidates.find((c) => c.id === value.userId)
            ?? searchResults?.find((c) => c.id === value.userId)
        : undefined

    function handleInputChange(name: string) {
        onChange({ userId: undefined, name, hand: value.hand })
        if (searchSelfUserId) search.setTerm(name)
    }

    function handlePick(item: PlayerSuggestion) {
        onChange({ userId: item.userId, name: item.label, hand: item.hand ?? value.hand }, item)
        if (searchSelfUserId) search.setTerm('')
    }

    return (
        <div>
            <div className="flex items-center justify-between gap-2 mb-2">
                <label className={`${MATCH_FORM_LABEL} mb-0`}>{label}</label>
                {value.userId && (
                    <span className="text-micro px-1.5 py-0.5 rounded-sm border border-primary/40 text-primary">
                        {linked?.isGuest ? '게스트 회원' : '회원 연결됨'}
                    </span>
                )}
            </div>

            <PlayerAutocomplete
                value={value.name}
                groups={groups}
                placeholder={placeholder ?? '이름 또는 닉네임'}
                onInputChange={handleInputChange}
                onPick={handlePick}
            />

            {showHand && (
                <div className="mt-3">
                    <FieldToggle
                        label="손잡이"
                        required={!value.userId}
                        options={HAND_OPTIONS}
                        value={value.hand || undefined}
                        onChange={(hand) => onChange({ ...value, hand })}
                    />
                </div>
            )}
        </div>
    )
}

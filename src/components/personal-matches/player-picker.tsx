'use client'

import { useState } from 'react'
import type { OpponentCandidate } from '@/lib/queries/users'
import type { PastOpponent } from '@/lib/queries/personal-matches'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { MATCH_FORM_INPUT as inputClass, MATCH_FORM_LABEL } from '@/lib/dashboard/tokens'
import { FieldToggle } from '@/components/personal-matches/field-toggle'

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
    value: PlayerPickerValue
    onChange: (value: PlayerPickerValue) => void
    placeholder?: string
    // 손잡이 입력 노출 여부 (직접 입력 모드에서만 실제 표시)
    showHand?: boolean
}

/**
 * 개인 경기 선수(상대/파트너) 선택 입력.
 * 콤보박스(클럽 회원 + 만나본 사람) ↔ 직접 입력 모드를 토글하며, 직접 입력 시 손잡이를 필수로 받는다.
 */
export function PlayerPicker({ label, candidates, pastOpponents = [], value, onChange, placeholder, showHand = true }: Props) {
    // userId가 있으면 회원 모드, 없으면 직접 입력 모드
    const [mode, setMode] = useState<'member' | 'external'>(value.userId ? 'member' : 'external')
    const [comboOpen, setComboOpen] = useState(false)

    const selected = candidates.find((c) => c.id === value.userId)
    // 콤보박스로 고를 대상(클럽 회원 또는 만나본 사람)이 하나라도 있으면 모드 토글 노출
    const hasPickable = candidates.length > 0 || pastOpponents.length > 0

    function switchMode(next: 'member' | 'external') {
        setMode(next)
        onChange({ userId: undefined, name: '', hand: '' })
    }

    return (
        <div>
            <label className={MATCH_FORM_LABEL}>{label}</label>

            {/* 입력 방식 — 현재 모드가 강조 표시되어 상태가 분명하다 */}
            {hasPickable && (
                <div className="mb-2">
                    <FieldToggle
                        options={[
                            { value: 'member', label: '목록에서 선택' },
                            { value: 'external', label: '직접 입력' },
                        ]}
                        value={mode}
                        onChange={(m) => { if (m !== mode) switchMode(m) }}
                    />
                </div>
            )}

            {mode === 'member' ? (
                <Popover open={comboOpen} onOpenChange={setComboOpen}>
                    <PopoverTrigger
                        type="button"
                        className={`${inputClass} text-left flex items-center justify-between`}
                    >
                        {selected ? (
                            <span>
                                {selected.name}
                                {selected.ntrp ? ` (${selected.ntrp})` : ''}
                                {selected.isGuest ? ' (게스트)' : ''}
                            </span>
                        ) : value.name ? (
                            <span>{value.name}</span>
                        ) : (
                            <span className="text-muted-foreground">상대 선택...</span>
                        )}
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-0" align="start">
                        <Command>
                            <CommandInput placeholder="이름으로 검색..." />
                            <CommandList>
                                <CommandEmpty>검색 결과가 없습니다</CommandEmpty>
                                {candidates.length > 0 && (
                                    <CommandGroup heading="클럽 회원">
                                        {candidates.map((c) => (
                                            <CommandItem
                                                key={c.id}
                                                value={`member-${c.name}`}
                                                onSelect={() => {
                                                    onChange({ userId: c.id, name: c.name, hand: '' })
                                                    setComboOpen(false)
                                                }}
                                            >
                                                <span>{c.name}</span>
                                                {c.ntrp && <span className="ml-1 text-muted-foreground">({c.ntrp})</span>}
                                                {c.isGuest && <span className="ml-1 text-muted-foreground text-xs">게스트</span>}
                                                {c.clubNames.length > 0 && (
                                                    <span className="ml-auto text-muted-foreground text-xs">
                                                        {c.clubNames[0]}
                                                    </span>
                                                )}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                )}
                                {pastOpponents.length > 0 && (
                                    <CommandGroup heading="만나본 사람">
                                        {pastOpponents.map((p) => (
                                            <CommandItem
                                                key={`past-${p.name}`}
                                                value={`past-${p.name}`}
                                                onSelect={() => {
                                                    // 비회원이므로 직접 입력 모드로 전환해 이름·손잡이를 편집·검증할 수 있게 한다.
                                                    onChange({ userId: undefined, name: p.name, hand: p.hand ?? '' })
                                                    setMode('external')
                                                    setComboOpen(false)
                                                }}
                                            >
                                                <span>{p.name}</span>
                                                {p.hand && (
                                                    <span className="ml-auto text-muted-foreground text-xs">
                                                        {p.hand === 'left' ? '왼손' : '오른손'}
                                                    </span>
                                                )}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                )}
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            ) : (
                <input
                    type="text"
                    value={value.name}
                    onChange={(e) => onChange({ ...value, userId: undefined, name: e.target.value })}
                    placeholder={placeholder ?? '이름 또는 닉네임'}
                    className={inputClass}
                />
            )}

            {/* 손잡이 (직접 입력 모드만, 필수) */}
            {showHand && mode === 'external' && (
                <div className="mt-3">
                    <FieldToggle
                        label="손잡이"
                        required
                        options={HAND_OPTIONS}
                        value={value.hand || undefined}
                        onChange={(hand) => onChange({ ...value, hand })}
                    />
                </div>
            )}
        </div>
    )
}

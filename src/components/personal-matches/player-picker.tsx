'use client'

import { useState } from 'react'
import type { OpponentCandidate } from '@/lib/queries/users'
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

type Hand = 'right' | 'left' | ''

const HAND_OPTIONS: { value: 'right' | 'left'; label: string }[] = [
    { value: 'right', label: '오른손' },
    { value: 'left', label: '왼손' },
]

const inputClass = 'w-full rounded-[4px] border border-input bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring'

export type PlayerPickerValue = {
    userId?: string
    name: string
    hand: Hand
}

type Props = {
    label: string
    candidates: OpponentCandidate[]
    value: PlayerPickerValue
    onChange: (value: PlayerPickerValue) => void
    placeholder?: string
    // 손잡이 입력 노출 여부 (직접 입력 모드에서만 실제 표시)
    showHand?: boolean
}

/**
 * 개인 경기 선수(상대/파트너) 선택 입력.
 * 클럽 회원 콤보박스 ↔ 직접 입력 모드를 토글하며, 직접 입력 시 손잡이도 받는다.
 */
export function PlayerPicker({ label, candidates, value, onChange, placeholder, showHand = true }: Props) {
    // userId가 있으면 회원 모드, 없으면 직접 입력 모드
    const [mode, setMode] = useState<'member' | 'external'>(value.userId ? 'member' : 'external')
    const [comboOpen, setComboOpen] = useState(false)

    const selected = candidates.find((c) => c.id === value.userId)

    function switchMode(next: 'member' | 'external') {
        setMode(next)
        onChange({ userId: undefined, name: '', hand: '' })
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-foreground">{label}</label>
                {candidates.length > 0 && (
                    <button
                        type="button"
                        onClick={() => switchMode(mode === 'member' ? 'external' : 'member')}
                        className="text-xs text-muted-foreground hover:text-foreground"
                    >
                        {mode === 'member' ? '직접 입력' : '클럽 회원 선택'}
                    </button>
                )}
            </div>

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
                        ) : (
                            <span className="text-muted-foreground">클럽 회원 검색...</span>
                        )}
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-0" align="start">
                        <Command>
                            <CommandInput placeholder="이름으로 검색..." />
                            <CommandList>
                                <CommandEmpty>검색 결과가 없습니다</CommandEmpty>
                                <CommandGroup>
                                    {candidates.map((c) => (
                                        <CommandItem
                                            key={c.id}
                                            value={c.name}
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

            {/* 손잡이 (직접 입력 모드만) */}
            {showHand && mode === 'external' && (
                <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">손잡이 (선택)</p>
                    <div className="grid grid-cols-2 gap-1.5">
                        {HAND_OPTIONS.map(({ value: hv, label: hl }) => {
                            const active = value.hand === hv
                            return (
                                <button
                                    key={hv}
                                    type="button"
                                    onClick={() => onChange({ ...value, hand: active ? '' : hv })}
                                    className={`py-2 text-xs rounded-md border transition-all ${
                                        active
                                            ? 'border-primary bg-primary/10 text-primary font-semibold'
                                            : 'border-border text-muted-foreground hover:border-input hover:text-foreground'
                                    }`}
                                >
                                    {hl}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}

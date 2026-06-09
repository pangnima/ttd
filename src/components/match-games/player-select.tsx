'use client'

import { useState } from 'react'
import {
    Combobox,
    ComboboxInputGroup,
    ComboboxInput,
    ComboboxTrigger,
    ComboboxContent,
    ComboboxList,
    ComboboxItem,
    ComboboxEmpty,
} from '@/components/ui/combobox'
import { UserPlus } from 'lucide-react'
import type { User } from '@/types'

const GENDER_EMOJI: Record<'male' | 'female', string> = { male: '♂️', female: '♀️' }

// 검색어로 새 게스트를 즉석 생성하는 가상 항목 (creatable 패턴)
type CreateOption = { id: string; create: 'male' | 'female'; query: string; label: string }
type Option = User | CreateOption

const isCreate = (o: Option): o is CreateOption => 'create' in o

type PlayerSelectProps = {
    users: User[]
    value: string
    onChange: (userId: string) => void
    placeholder?: string
    onCreatePlayer?: (nickname: string, gender: 'male' | 'female') => string
}

export function PlayerSelect({ users, value, onChange, placeholder = '선수 선택', onCreatePlayer }: PlayerSelectProps) {
    // inputValue는 base-ui가 자동 관리(선택 시 라벨 표시·타이핑). query는 게스트 추가 항목 구성용으로만 추적한다.
    const [query, setQuery] = useState('')

    const selectedUser = users.find((u) => u.id === value) ?? null

    const trimmed = query.trim()
    const lowered = trimmed.toLowerCase()
    const filteredUsers = users.filter((u) => trimmed === '' || u.nickname.toLowerCase().includes(lowered))
    const exactExists = users.some((u) => u.nickname.trim().toLowerCase() === lowered)

    // 검색어가 있고 정확히 일치하는 선수가 없을 때만 남/여 게스트 추가 항목을 노출
    const createOptions: CreateOption[] =
        onCreatePlayer && trimmed !== '' && !exactExists
            ? [
                { id: '__create-male', create: 'male', query: trimmed, label: `'${trimmed}' 남자 게스트 추가` },
                { id: '__create-female', create: 'female', query: trimmed, label: `'${trimmed}' 여자 게스트 추가` },
            ]
            : []

    const items: Option[] = [...filteredUsers, ...createOptions]

    const handleValueChange = (option: Option | null) => {
        if (option && isCreate(option)) {
            onCreatePlayer?.(option.query, option.create)
            setQuery('')
            return
        }
        onChange(option?.id ?? '')
    }

    return (
        <Combobox
            items={items}
            value={selectedUser}
            onValueChange={handleValueChange}
            onInputValueChange={(v) => setQuery(v)}
            // 필터는 위에서 직접 처리하므로 내부 자동 필터를 끈다 (게스트 추가 항목 제어를 위해)
            filter={null}
            itemToStringLabel={(o: Option) => (isCreate(o) ? o.label : o.nickname)}
            isItemEqualToValue={(a: Option, b: Option) => a?.id === b?.id}
        >
            <ComboboxInputGroup>
                <ComboboxInput placeholder={placeholder} />
                <ComboboxTrigger aria-label="선수 목록 열기" />
            </ComboboxInputGroup>
            <ComboboxContent>
                <ComboboxEmpty>검색 결과 없음</ComboboxEmpty>
                <ComboboxList>
                    {(item: Option) =>
                        isCreate(item) ? (
                            <ComboboxItem key={item.id} value={item} className="gap-1.5 text-primary">
                                <UserPlus className="size-3.5 shrink-0" />
                                <span className="truncate">
                                    {GENDER_EMOJI[item.create]} &apos;{item.query}&apos;{' '}
                                    {item.create === 'male' ? '남자' : '여자'} 게스트 추가
                                </span>
                            </ComboboxItem>
                        ) : (
                            <ComboboxItem key={item.id} value={item} className="gap-1.5">
                                <span className="text-xs shrink-0">{GENDER_EMOJI[item.gender]}</span>
                                <span className="truncate">{item.nickname}</span>
                                {item.isGuest && (
                                    <span className="text-xs text-muted-foreground shrink-0">(게스트)</span>
                                )}
                            </ComboboxItem>
                        )
                    }
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    )
}

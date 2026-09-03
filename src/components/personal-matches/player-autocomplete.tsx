'use client'

import { useRef } from 'react'
import { Autocomplete } from '@base-ui/react/autocomplete'
import type { PlayerSuggestion, PlayerSuggestionGroup } from '@/lib/personal-matches/player-suggestions'
import { PlayerSuggestionItem } from '@/components/personal-matches/player-suggestion-item'
import { MATCH_FORM_INPUT } from '@/lib/dashboard/tokens'

type Props = {
    value: string                       // 입력 텍스트 (= 선수 이름)
    groups: PlayerSuggestionGroup[]
    placeholder?: string
    onInputChange: (name: string) => void   // 타이핑 — 회원 연결 해제 + 이름 갱신
    onPick: (item: PlayerSuggestion) => void
}

export const POPUP_CLASS =
    'relative isolate z-50 max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0'
export const ITEM_CLASS =
    'relative flex w-full cursor-default items-center gap-1.5 rounded-md px-2 py-1.5 text-body2 outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground'

/**
 * 자유 텍스트 + 후보 제안 입력 (base-ui Autocomplete).
 * Combobox와 달리 항목을 고르지 않고 닫아도 입력값이 유지되어 게스트 이름 직접 입력과 공존한다.
 * mode="none": 필터는 buildPlayerSuggestionGroups가 이미 수행했으므로 목록을 그대로 렌더한다.
 */
export function PlayerAutocomplete({ value, groups, placeholder, onInputChange, onPick }: Props) {
    // 키보드로 하이라이트된 항목 — Enter 시 선택 (하이라이트가 없으면 폼 제출만 막는다)
    const highlighted = useRef<PlayerSuggestion | undefined>(undefined)

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key !== 'Enter') return
        e.preventDefault()
        if (e.nativeEvent.isComposing) return  // 한글 조합 중 Enter 무시
        if (highlighted.current) onPick(highlighted.current)
    }

    return (
        <Autocomplete.Root
            items={groups}
            mode="none"
            value={value}
            onValueChange={(next, details) => {
                // 항목 선택은 onPick이 처리 — 입력값 동기화만 여기서
                if (details.reason === 'item-press') return
                onInputChange(next)
            }}
            onItemHighlighted={(item) => { highlighted.current = item }}
            openOnInputClick
        >
            <Autocomplete.Input
                placeholder={placeholder}
                className={MATCH_FORM_INPUT}
                autoComplete="off"
                onKeyDown={handleKeyDown}
            />
            <Autocomplete.Portal>
                <Autocomplete.Positioner className="isolate z-50" sideOffset={4}>
                    <Autocomplete.Popup className={POPUP_CLASS}>
                        <Autocomplete.Empty className="px-3 py-2 text-caption text-muted-foreground break-keep">
                            일치하는 후보가 없습니다. 입력한 이름 그대로 저장됩니다.
                        </Autocomplete.Empty>
                        <Autocomplete.List className="outline-none">
                            {(group: PlayerSuggestionGroup) => (
                                <Autocomplete.Group key={group.value} items={group.items} className="pb-1 last:pb-0">
                                    <Autocomplete.GroupLabel className="px-2 py-1.5 text-caption font-medium text-muted-foreground">
                                        {group.value}
                                    </Autocomplete.GroupLabel>
                                    <Autocomplete.Collection>
                                        {(item: PlayerSuggestion) => (
                                            <Autocomplete.Item
                                                key={item.value}
                                                value={item}
                                                className={ITEM_CLASS}
                                                onClick={() => onPick(item)}
                                            >
                                                <PlayerSuggestionItem item={item} />
                                            </Autocomplete.Item>
                                        )}
                                    </Autocomplete.Collection>
                                </Autocomplete.Group>
                            )}
                        </Autocomplete.List>
                    </Autocomplete.Popup>
                </Autocomplete.Positioner>
            </Autocomplete.Portal>
        </Autocomplete.Root>
    )
}

'use client'

import { useMemo, useRef } from 'react'
import { Autocomplete } from '@base-ui/react/autocomplete'
import { ITEM_CLASS, POPUP_CLASS } from '@/components/personal-matches/player-autocomplete'
import { MATCH_FORM_INPUT } from '@/lib/dashboard/tokens'
import { COURT_NAME_MAX_LENGTH } from '@/lib/personal-matches/validate-input'

type Props = {
    value: string
    recentCourtNames: string[]  // 본인이 이전에 입력한 코트명(최근순, 중복 제거)
    onChange: (v: string) => void
    placeholder?: string
}

/**
 * 코트명 자유 텍스트 + '최근 코트' 재선택 (base-ui Autocomplete).
 * PlayerAutocomplete와 같은 뼈대지만 후보가 문자열뿐이라 그룹/렌더러 없이 얇게 유지한다.
 * 항목을 고르지 않고 닫아도 입력값이 유지되어 새 코트명 직접 입력과 공존한다.
 */
export function CourtNameAutocomplete({ value, recentCourtNames, onChange, placeholder }: Props) {
    // 부분일치(대소문자 무시) 필터 — 빈 입력이면 전체 노출
    const items = useMemo(() => {
        const q = value.trim().toLowerCase()
        return q ? recentCourtNames.filter((n) => n.toLowerCase().includes(q)) : recentCourtNames
    }, [value, recentCourtNames])

    // 키보드로 하이라이트된 항목 — Enter 시 선택 (하이라이트가 없으면 폼 제출만 막는다)
    const highlighted = useRef<string | undefined>(undefined)

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key !== 'Enter') return
        e.preventDefault()
        if (e.nativeEvent.isComposing) return  // 한글 조합 중 Enter 무시
        if (highlighted.current) onChange(highlighted.current)
    }

    return (
        <Autocomplete.Root
            items={items}
            mode="none"
            value={value}
            onValueChange={(next) => onChange(next)}
            onItemHighlighted={(item) => { highlighted.current = item }}
            openOnInputClick
        >
            <Autocomplete.Input
                placeholder={placeholder}
                className={MATCH_FORM_INPUT}
                autoComplete="off"
                maxLength={COURT_NAME_MAX_LENGTH}
                onKeyDown={handleKeyDown}
            />
            {items.length > 0 && (
                <Autocomplete.Portal>
                    <Autocomplete.Positioner className="isolate z-50" sideOffset={4}>
                        <Autocomplete.Popup className={POPUP_CLASS}>
                            <p className="px-2 py-1.5 text-caption font-medium text-muted-foreground">최근 코트</p>
                            <Autocomplete.List className="outline-none">
                                {(item: string) => (
                                    <Autocomplete.Item key={item} value={item} className={ITEM_CLASS}>
                                        {item}
                                    </Autocomplete.Item>
                                )}
                            </Autocomplete.List>
                        </Autocomplete.Popup>
                    </Autocomplete.Positioner>
                </Autocomplete.Portal>
            )}
        </Autocomplete.Root>
    )
}

'use client'

import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MATCH_FORM_INPUT } from '@/lib/dashboard/tokens'

type Props = {
    value: string
    onChange: (value: string) => void
    /** [검색] 버튼·Enter — 조회는 호출부의 useMemberLookup.search가 한다 */
    onSearch: () => void
    loading?: boolean
    placeholder?: string
    autoFocus?: boolean
}

/**
 * 회원 검색 입력 한 줄 — 입력창 + [검색] 버튼. 타이핑 중에는 조회하지 않고 버튼이나 Enter가 부른다.
 * 언제 조회되는지가 화면에 보여야 "입력했는데 안 나온다"가 사라진다.
 *
 * Enter는 조합 여부와 무관하게 preventDefault — 매칭 만들기 `<form>` 안에서는 폼 제출이 되기 때문이다.
 * 한글 조합 중 Enter(isComposing)는 조회하지 않는다(PlayerAutocomplete와 같은 가드).
 * `ui/input-group`은 h-8·text-sm이라 16px 입력 규칙에 어긋나 쓰지 않는다.
 */
export function MemberSearchField({ value, onChange, onSearch, loading = false, placeholder, autoFocus }: Props) {
    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key !== 'Enter') return
        e.preventDefault()
        if (e.nativeEvent.isComposing || loading) return
        onSearch()
    }

    return (
        <div className="flex gap-2">
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder ?? '이름 또는 닉네임'}
                autoComplete="off"
                autoFocus={autoFocus}
                aria-label="회원 검색"
                className={`${MATCH_FORM_INPUT} min-w-0 flex-1`}
            />
            <Button
                type="button"
                variant="outline"
                onClick={onSearch}
                disabled={loading}
                className="h-12 shrink-0 gap-1 px-4 text-body"
            >
                <Search className="size-4" />
                {loading ? '검색 중…' : '검색'}
            </Button>
        </div>
    )
}

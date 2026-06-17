'use client'

import { MATCH_FORM_LABEL } from '@/lib/dashboard/tokens'

type Option<T extends string> = { value: T; label: string }

type FieldToggleProps<T extends string> = {
    label?: string
    // label 에 ' *' 부착
    required?: boolean
    options: Option<T>[]
    value: T | undefined
    onChange: (v: T) => void
}

// 옵션 개수별 정적 grid 클래스 (Tailwind purge 대응 — 동적 문자열 금지)
const GRID_COLS: Record<number, string> = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
}

/**
 * 폼 필드용 2지(이상) 선택 토글 — 손잡이·복식 방식·목록/직접입력 등에서 공유한다.
 * 활성은 info 강조색, 비활성도 text-foreground라 클릭 가능함이 분명하다(disabled처럼 보이지 않음).
 * 카드 헤더의 pill 형 common/SegmentedToggle과는 용도가 다른 풀폭 그리드 토글이다.
 */
export function FieldToggle<T extends string>({
    label,
    required = false,
    options,
    value,
    onChange,
}: FieldToggleProps<T>) {
    return (
        <div>
            {label && (
                <label className={MATCH_FORM_LABEL}>
                    {label}
                    {required ? ' *' : ''}
                </label>
            )}
            <div className={`grid gap-1.5 ${GRID_COLS[options.length] ?? 'grid-cols-2'}`}>
                {options.map((o) => {
                    const active = value === o.value
                    return (
                        <button
                            key={o.value}
                            type="button"
                            onClick={() => onChange(o.value)}
                            aria-pressed={active}
                            className={`px-2.5 py-2 text-xs rounded-md border transition-colors ${
                                active
                                    ? 'border-accent-lime bg-accent-lime text-accent-lime-foreground font-semibold'
                                    : 'border-input text-foreground hover:bg-muted/40'
                            }`}
                        >
                            {o.label}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

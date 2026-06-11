'use client'

import { cn } from '@/lib/utils'

/**
 * Baseline 세그먼트 토글 — 단식/복식 등 2~N개 분기 선택(가이드 Inputs 섹션).
 * 컨트롤드 컴포넌트. 트랙은 surface-2, 활성 세그먼트는 surface(card)로 떠오름.
 */
type SegmentedOption<T extends string> = {
    value: T
    label: string
}

type SegmentedToggleProps<T extends string> = {
    options: SegmentedOption<T>[]
    value: T
    onValueChange: (value: T) => void
    className?: string
}

export function SegmentedToggle<T extends string>({
    options,
    value,
    onValueChange,
    className,
}: SegmentedToggleProps<T>) {
    return (
        <div className={cn('inline-flex gap-0.5 rounded-md border border-border bg-secondary p-0.5', className)}>
            {options.map((opt) => {
                const active = opt.value === value
                return (
                    <button
                        key={opt.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onValueChange(opt.value)}
                        className={cn(
                            'rounded-sm px-3 py-1 text-sm font-medium transition-colors',
                            active
                                ? 'bg-card text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        {opt.label}
                    </button>
                )
            })}
        </div>
    )
}

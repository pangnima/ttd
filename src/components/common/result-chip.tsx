import { cn } from '@/lib/utils'

/**
 * Baseline 결과 칩 — 승/패/무를 색 + 글자(W/L/D) 이중표기.
 * 패배는 빨강이 아닌 클레이(loss). 색각 접근성을 위해 글자를 항상 노출.
 */
type ResultOutcome = 'W' | 'L' | 'D'
type ResultChipSize = 'sm' | 'md' | 'lg'

const OUTCOME_STYLE: Record<ResultOutcome, string> = {
    W: 'bg-win text-win-foreground',
    L: 'bg-loss text-loss-foreground',
    D: 'bg-muted text-muted-foreground',
}

const SIZE_STYLE: Record<ResultChipSize, string> = {
    sm: 'size-5 text-[11px] rounded-xs',
    md: 'size-7 text-sm rounded-sm',
    lg: 'size-10 text-lg rounded-md',
}

type ResultChipProps = {
    outcome: ResultOutcome
    size?: ResultChipSize
    className?: string
}

export function ResultChip({ outcome, size = 'md', className }: ResultChipProps) {
    return (
        <span
            className={cn(
                'inline-flex shrink-0 items-center justify-center font-bold leading-none',
                OUTCOME_STYLE[outcome],
                SIZE_STYLE[size],
                className,
            )}
            aria-label={outcome === 'W' ? '승' : outcome === 'L' ? '패' : '무'}
        >
            {outcome}
        </span>
    )
}

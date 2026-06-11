import { cn } from '@/lib/utils'

/**
 * Baseline status-dot 칩 — 점 + 라벨. 활동중/부상/리그진행/휴식 등 상태 표기.
 */
type StatusTone = 'win' | 'loss' | 'info' | 'neutral'

const DOT_STYLE: Record<StatusTone, string> = {
    win: 'bg-win',
    loss: 'bg-loss',
    info: 'bg-info',
    neutral: 'bg-muted-foreground',
}

type StatusDotProps = {
    tone?: StatusTone
    children: React.ReactNode
    className?: string
}

export function StatusDot({ tone = 'neutral', children, className }: StatusDotProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-2 py-0.5 text-xs font-medium text-foreground',
                className,
            )}
        >
            <span className={cn('size-1.5 rounded-full', DOT_STYLE[tone])} />
            {children}
        </span>
    )
}

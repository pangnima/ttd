import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * Baseline 칩 — 가이드 Components(Chips) 재현.
 * variant: 채움(solid)·틴트(soft)·외곽선(outline)
 * tone: 시맨틱 색 (win/loss/info/lime/neutral/ink)
 */
type ChipVariant = 'solid' | 'soft' | 'outline'
type ChipTone = 'win' | 'loss' | 'info' | 'lime' | 'neutral' | 'ink'

const TONE_BY_VARIANT: Record<ChipVariant, Record<ChipTone, string>> = {
    solid: {
        win: 'bg-win text-win-foreground border-transparent',
        loss: 'bg-loss text-loss-foreground border-transparent',
        info: 'bg-info text-info-foreground border-transparent',
        lime: 'bg-accent-lime text-accent-lime-foreground border-transparent',
        neutral: 'bg-secondary text-secondary-foreground border-transparent',
        ink: 'bg-primary text-primary-foreground border-transparent',
    },
    soft: {
        win: 'bg-win/15 text-win border-transparent',
        loss: 'bg-loss/15 text-loss border-transparent',
        info: 'bg-info/15 text-info border-transparent',
        lime: 'bg-accent-lime/20 text-foreground border-transparent',
        neutral: 'bg-muted text-muted-foreground border-transparent',
        ink: 'bg-secondary text-foreground border-transparent',
    },
    outline: {
        win: 'bg-transparent text-win border-win/50',
        loss: 'bg-transparent text-loss border-loss/50',
        info: 'bg-transparent text-info border-info/50',
        lime: 'bg-transparent text-foreground border-accent-lime/60',
        neutral: 'bg-transparent text-muted-foreground border-border',
        ink: 'bg-transparent text-foreground border-foreground/30',
    },
}

type ChipProps = {
    children: ReactNode
    variant?: ChipVariant
    tone?: ChipTone
    className?: string
}

export function Chip({ children, variant = 'soft', tone = 'neutral', className }: ChipProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
                TONE_BY_VARIANT[variant][tone],
                className,
            )}
        >
            {children}
        </span>
    )
}

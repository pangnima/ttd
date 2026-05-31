export const CARD_BASE = 'rounded-xl border border-border bg-card'
export const CARD_HOVER = 'hover:bg-muted/50 transition-colors'
export const SECTION_LABEL = 'text-[22px] font-bold tracking-tight text-foreground'
export const PILL_BASE = 'inline-flex items-center text-xs px-2 py-0.5 rounded-[4px] border'
export const EMPTY_BLOCK =
    'rounded-xl border border-dashed border-border bg-muted/30 text-muted-foreground text-sm text-center py-8'

export const TEXT_META = 'text-muted-foreground'
export const TEXT_MUTED = 'text-muted-foreground'

/** 승률 계산 (무승부 제외 분모). 경기 없으면 null. */
export function calcWinRate(wins: number, losses: number): number | null {
    const decisive = wins + losses
    return decisive === 0 ? null : Math.round((wins / decisive) * 100)
}

export const CARD_BASE = 'rounded-xl border border-foreground/8 bg-foreground/[0.02]'
export const CARD_HOVER = 'hover:border-foreground/18 hover:bg-foreground/[0.04] transition-all'
export const SECTION_LABEL = 'text-[11px] font-medium tracking-widest uppercase text-foreground/65'
export const PILL_BASE = 'inline-flex items-center text-[11px] px-2 py-0.5 rounded-[4px] border'
export const EMPTY_BLOCK =
    'rounded-xl border border-dashed border-foreground/10 bg-foreground/[0.01] text-foreground/55 text-xs text-center py-8'
export const DIVIDER = 'h-px bg-foreground/8'

export const TEXT_HEADING = 'text-foreground'
export const TEXT_BODY_STRONG = 'text-foreground/90'
export const TEXT_BODY = 'text-foreground/80'
export const TEXT_META = 'text-foreground/65'
export const TEXT_MUTED = 'text-foreground/55'
export const TEXT_DISABLED = 'text-foreground/45'

/** 승률 계산 (무승부 제외 분모). 경기 없으면 null. */
export function calcWinRate(wins: number, losses: number): number | null {
    const decisive = wins + losses
    return decisive === 0 ? null : Math.round((wins / decisive) * 100)
}

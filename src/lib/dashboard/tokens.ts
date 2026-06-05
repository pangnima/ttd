export const CARD_BASE = 'rounded-xl border border-border bg-card'
export const CARD_HOVER = 'hover:bg-muted/50 transition-colors'
export const SECTION_LABEL = 'text-[22px] font-bold tracking-tight text-foreground'
export const PILL_BASE = 'inline-flex items-center text-xs px-2 py-0.5 rounded-[4px] border'
export const EMPTY_BLOCK =
    'rounded-xl border border-dashed border-border bg-muted/30 text-muted-foreground text-sm text-center py-8'

export const TEXT_META = 'text-muted-foreground'
export const TEXT_MUTED = 'text-muted-foreground'

/** 폼 입력 필드 공통 스타일 (auth/profile 폼에서 공유) */
export const FORM_INPUT_BASE = [
    'w-full rounded-md px-3 py-2.5 text-sm text-foreground',
    'bg-background border border-input',
    'placeholder:text-muted-foreground',
    'outline-none focus:border-ring transition-colors',
].join(' ')

/** 폼 라벨 공통 스타일 (auth/profile 폼에서 공유) */
export const FORM_LABEL_BASE = 'block text-[11px] font-medium tracking-widest uppercase text-muted-foreground mb-1.5'

/** AI 코칭 카드 섹션 제목 색상 (강점/개선/팁/에러) */
export const AI_COACHING_STYLE = {
    strength: 'text-green-600',
    weakness: 'text-orange-500',
    tip: 'text-blue-500',
    error: 'text-red-500',
} as const

/** 승률 계산 (무승부 제외 분모). 경기 없으면 null. */
export function calcWinRate(wins: number, losses: number): number | null {
    const decisive = wins + losses
    return decisive === 0 ? null : Math.round((wins / decisive) * 100)
}

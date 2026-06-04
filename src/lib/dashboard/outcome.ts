/**
 * 경기 결과(승/패/무) 공통 스타일 및 라벨 정의.
 * 여러 컴포넌트에서 중복 정의되던 OUTCOME_STYLE/LABEL/WINNER_STYLE을 단일화.
 */

// ── 클럽 매치용 (win/loss/draw/unknown) ─────────────────────────────
export const OUTCOME_STYLE: Record<'win' | 'loss' | 'draw' | 'unknown', string> = {
    win: 'border-emerald-600/50 text-emerald-700 bg-emerald-500/10 dark:border-emerald-400/40 dark:text-emerald-400/80 dark:bg-emerald-400/8',
    loss: 'border-red-600/50 text-red-700 bg-red-500/10 dark:border-red-400/40 dark:text-red-400/80 dark:bg-red-400/8',
    draw: 'border-border text-muted-foreground bg-muted/50',
    unknown: 'border-border text-muted-foreground bg-muted/30',
}

export const OUTCOME_LABEL: Record<'win' | 'loss' | 'draw' | 'unknown', string> = {
    win: '승',
    loss: '패',
    draw: '무',
    unknown: '-',
}

// ── 최근 폼 배지용 (W/L/D 문자 기반) ────────────────────────────────
export const FORM_BADGE_STYLE: Record<'W' | 'L' | 'D', string> = {
    W: 'bg-emerald-500/20 text-emerald-700 border border-emerald-500/30 dark:text-emerald-400',
    L: 'bg-red-500/20 text-red-700 border border-red-500/30 dark:text-red-400',
    D: 'bg-muted text-muted-foreground border border-border',
}

// ── H2H 상세 패널용 (W/L/D 문자 기반, 인라인 border 포함) ────────────
export const H2H_OUTCOME_STYLE: Record<'W' | 'L' | 'D', string> = {
    W: 'bg-green-500/20 text-green-600 border-green-500/30 dark:text-green-400',
    L: 'bg-red-500/20 text-red-600 border-red-500/30 dark:text-red-400',
    D: 'bg-muted text-muted-foreground border-border',
}

export const H2H_OUTCOME_LABEL: Record<'W' | 'L' | 'D', string> = {
    W: '승',
    L: '패',
    D: '무',
}

// ── 개인 경기용 (me/opponent/draw) ────────────────────────────────────
export const PERSONAL_OUTCOME_STYLE: Record<'me' | 'opponent' | 'draw', string> = {
    me: 'text-green-600 font-bold dark:text-green-400',
    opponent: 'text-red-500 font-bold dark:text-red-400',
    draw: 'text-muted-foreground font-bold',
}

export const PERSONAL_OUTCOME_LABEL: Record<'me' | 'opponent' | 'draw', string> = {
    me: '승',
    opponent: '패',
    draw: '무',
}

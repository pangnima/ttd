/**
 * 경기 결과(승/패/무) 공통 스타일 및 라벨 정의.
 * 여러 컴포넌트에서 중복 정의되던 OUTCOME_STYLE/LABEL/WINNER_STYLE을 단일화.
 */

// ── 클럽 매치용 (win/loss/draw/unknown) ─────────────────────────────
// Baseline: 승=코트그린(win), 패=클레이(loss). 색 + W/L 글자 이중표기로 색각 접근성 확보.
export const OUTCOME_STYLE: Record<'win' | 'loss' | 'draw' | 'unknown', string> = {
    win: 'border-win/40 text-win bg-win/10',
    loss: 'border-loss/40 text-loss bg-loss/10',
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
    W: 'bg-win/20 text-win border border-win/30',
    L: 'bg-loss/20 text-loss border border-loss/30',
    D: 'bg-muted text-muted-foreground border border-border',
}

// ── H2H 상세 패널용 (W/L/D 문자 기반, 인라인 border 포함) ────────────
export const H2H_OUTCOME_STYLE: Record<'W' | 'L' | 'D', string> = {
    W: 'bg-win/20 text-win border-win/30',
    L: 'bg-loss/20 text-loss border-loss/30',
    D: 'bg-muted text-muted-foreground border-border',
}

export const H2H_OUTCOME_LABEL: Record<'W' | 'L' | 'D', string> = {
    W: '승',
    L: '패',
    D: '무',
}

// ── 개인 경기용 (me/opponent/draw) ────────────────────────────────────
export const PERSONAL_OUTCOME_STYLE: Record<'me' | 'opponent' | 'draw', string> = {
    me: 'text-win font-bold',
    opponent: 'text-loss font-bold',
    draw: 'text-muted-foreground font-bold',
}

export const PERSONAL_OUTCOME_LABEL: Record<'me' | 'opponent' | 'draw', string> = {
    me: '승',
    opponent: '패',
    draw: '무',
}

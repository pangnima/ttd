export const CARD_BASE = 'rounded-lg border border-border bg-card'
export const CARD_HOVER = 'hover:bg-muted/50 transition-colors'

/**
 * 시맨틱 타이포 스케일 — 가이드 위계(Display/Headline/Title/Body/Caption/Mono Label).
 * 한 곳에서 위계를 관리해 컴포넌트 간 일관성을 유지한다. (.type-* 유틸은 globals.css 정의)
 */
export const TYPO = {
    display: 'type-display text-foreground', // 대형 수치/지표 (~76px)
    headline: 'type-headline text-foreground', // 페이지 헤드라인 (30px)
    title: 'type-title text-foreground', // 타이틀 (19px)
    caption: 'type-caption text-muted-foreground', // 캡션 (13px)
    monoLabel: 'type-mono-label text-muted-foreground', // 라벨/스코어 (11px caps)
    pageTitle: 'text-2xl font-semibold tracking-tight text-foreground', // 페이지 h1 (24px)
    sectionLabel: 'text-lg font-semibold tracking-tight text-foreground', // 섹션 헤더 (18px)
    cardTitle: 'text-[15px] font-semibold leading-snug text-foreground', // 카드 제목 (15px)
    body: 'text-[15px] text-foreground', // 본문 기본 (15px)
    bodyMuted: 'text-[15px] text-muted-foreground',
    label: 'text-sm text-muted-foreground', // 라벨/보조 (14px)
    meta: 'text-xs text-muted-foreground', // 진짜 메타만 (12px)
} as const

/** 섹션 헤더 — TYPO.sectionLabel과 동일 값(기존 호출부 호환용 alias) */
export const SECTION_LABEL = TYPO.sectionLabel
// 칩 radius 4px(rounded-sm)
export const PILL_BASE = 'inline-flex items-center text-xs px-2 py-0.5 rounded-sm border'
export const EMPTY_BLOCK =
    'rounded-lg border border-dashed border-border bg-muted/30 text-muted-foreground text-sm text-center py-8'

export const TEXT_META = 'text-muted-foreground'
export const TEXT_MUTED = 'text-muted-foreground'

/** 폼 입력 필드 공통 스타일 (auth/profile 폼에서 공유) — 인풋 radius 4px */
export const FORM_INPUT_BASE = [
    'w-full rounded-sm px-3 py-2.5 text-sm text-foreground',
    'bg-background border border-input',
    'placeholder:text-muted-foreground',
    'outline-none focus:border-ring transition-colors',
].join(' ')

/** 폼 라벨 공통 스타일 (auth/profile 폼에서 공유) */
export const FORM_LABEL_BASE = 'block text-[11px] font-medium tracking-widest uppercase text-muted-foreground mb-1.5'

/**
 * 경기 입력 폼(개인 경기기록 등) 공통 인풋/라벨 스타일.
 * auth용 FORM_*_BASE와 시각 위계가 달라(라벨 일반 케이스, 인풋 py-2) 별도 토큰으로 둔다.
 */
export const MATCH_FORM_INPUT =
    'w-full rounded-[4px] border border-input bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring'
export const MATCH_FORM_LABEL = 'text-sm font-medium text-foreground block mb-1'

/** AI 코칭 카드 섹션 제목 색상 (강점/개선/팁/에러) */
export const AI_COACHING_STYLE = {
    strength: 'text-win', // 강점 → 코트그린
    weakness: 'text-loss', // 개선 → 클레이
    tip: 'text-info', // 팁 → 일렉트릭블루
    error: 'text-destructive', // 에러 → 위험(빨강)
} as const

/** 승률 계산 (무승부 제외 분모). 경기 없으면 null. */
export function calcWinRate(wins: number, losses: number): number | null {
    const decisive = wins + losses
    return decisive === 0 ? null : Math.round((wins / decisive) * 100)
}

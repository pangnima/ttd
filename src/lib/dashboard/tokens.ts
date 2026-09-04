export const CARD_BASE = 'rounded-lg border border-border bg-card'
export const CARD_HOVER = 'hover:bg-muted/50 transition-colors'

/**
 * 시맨틱 타이포 스케일 — 8레벨 + 배지 예외 (docs/typography.md).
 * 사이즈·줄간격·자간은 globals.css @theme 토큰(text-display/h1~h4/body/body2/caption/micro)이 담당하고,
 * 여기서는 굵기·색상만 조합한다. 원칙: 태그는 문서 아웃라인, 클래스는 시각 레벨.
 *
 * | 레벨    | 모바일→데스크톱 | 용도                               |
 * | display | 36→48px         | 랜딩 최상단 카피                   |
 * | h1      | 28→36px         | 페이지 대제목 (PageHeader)         |
 * | h2      | 24→28px         | 문서형 화면(랜딩·가이드·인증) 주요 섹션 |
 * | h3      | 20→24px         | 앱 화면 페이지 내 섹션 헤더        |
 * | h4      | 18→20px         | 카드 제목·폼 그룹 제목             |
 * | body    | 16px 고정       | 기본 본문·폼                       |
 * | body2   | 14px 고정       | 부가 텍스트·메타·nav               |
 * | caption | 12px 고정       | 캡션·경고·도움말·범례              |
 * | micro   | 11px (예외)     | 배지·카운트 전용 — 본문 금지       |
 */
export const TYPO = {
    display: 'text-display font-extrabold text-foreground',
    h1: 'text-h1 font-bold text-foreground',
    h2: 'text-h2 font-bold text-foreground',
    h3: 'text-h3 font-semibold text-foreground',
    h4: 'text-h4 font-semibold text-foreground',
    body: 'text-body text-foreground',
    bodyMuted: 'text-body text-muted-foreground',
    body2: 'text-body2 text-foreground',
    body2Muted: 'text-body2 text-muted-foreground',
    caption: 'text-caption text-muted-foreground',
    captionStrong: 'text-caption font-medium text-foreground',
    /** 소형 대문자 라벨(구 mono-label) — 12px caps + 넓은 자간 */
    eyebrow: 'text-caption font-medium tracking-eyebrow uppercase tabular-nums text-muted-foreground',
    /** 배지·카운트 전용 예외 11px */
    micro: 'text-micro font-medium leading-none',
} as const

// 칩 radius 4px(rounded-sm)
export const PILL_BASE = 'inline-flex items-center text-caption px-2 py-0.5 rounded-sm border'
// 빈 상태도 데이터 카드(CARD_BASE)와 동일한 채워진 surface로 표시 — 라이트 모드 시인성.
// break-keep: 한글이 글자 단위가 아닌 어절(띄어쓰기) 단위로 줄바꿈되도록.
export const EMPTY_BLOCK =
    'rounded-lg border border-border bg-card text-muted-foreground text-body2 text-center py-8 px-4 break-keep'

export const TEXT_META = 'text-muted-foreground'
export const TEXT_MUTED = 'text-muted-foreground'

/**
 * 폼 입력 필드 공통 스타일 (auth/profile 폼에서 공유).
 * 폰트는 Body1 16px 고정(iOS Safari 포커스 줌 방지 — 전 뷰포트). py-3로 ~48px 높이,
 * 동일 토큰을 textarea에 써도 자연 확장되도록 고정 높이를 두지 않는다.
 */
export const FORM_INPUT_BASE = [
    'w-full rounded-lg px-3 py-3 text-body text-foreground',
    'bg-background border border-input dark:bg-input/30',
    'placeholder:text-muted-foreground',
    'outline-none focus:border-ring transition-colors',
].join(' ')

/** 폼 라벨 공통 스타일 (auth/profile 폼에서 공유) — Caption 12px caps */
export const FORM_LABEL_BASE = 'block text-caption font-medium tracking-eyebrow uppercase text-muted-foreground mb-1.5'

/**
 * 경기 입력 폼(개인 경기기록 등) 공통 인풋/라벨 스타일.
 * auth용 FORM_*_BASE와 시각 위계가 달라(라벨 일반 케이스) 별도 토큰으로 둔다. 인풋 폰트는 동일하게 16px.
 */
export const MATCH_FORM_INPUT =
    'w-full rounded-lg border border-input bg-background dark:bg-input/30 px-3 py-3 text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring'
export const MATCH_FORM_LABEL = 'text-body font-medium text-foreground block mb-2'

/** AI 코칭 카드 섹션 제목 색상 (강점/개선/팁/에러) */
export const AI_COACHING_STYLE = {
    strength: 'text-win', // 강점 → 민트
    weakness: 'text-loss', // 개선 → 코랄
    tip: 'text-info', // 팁 → 블루
    error: 'text-destructive', // 에러 → 위험(코랄)
} as const

/** 승률 계산 (무승부 제외 분모). 경기 없으면 null. */
export function calcWinRate(wins: number, losses: number): number | null {
    const decisive = wins + losses
    return decisive === 0 ? null : Math.round((wins / decisive) * 100)
}

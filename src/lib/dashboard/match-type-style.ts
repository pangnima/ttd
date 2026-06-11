import type { MatchType } from '@/types'

type MatchTypeStyle = {
    label: string
    textClass: string
    borderClass: string
    bgClass: string
}

// 경기 타입은 '결과'가 아닌 '카테고리' 태그 — win(코트그린)/loss(클레이) 시맨틱과
// 충돌하지 않도록 그린·클레이 계열을 피한다. 단식은 브랜드 info(블루)에 앵커.
const STYLES: Record<MatchType, MatchTypeStyle> = {
    singles: {
        label: '단식',
        textClass: 'text-info',
        borderClass: 'border-info/40',
        bgClass: 'bg-info/10',
    },
    men_doubles: {
        label: '남복',
        textClass: 'text-sky-600 dark:text-sky-400',
        borderClass: 'border-sky-600/40 dark:border-sky-400/40',
        bgClass: 'bg-sky-600/10 dark:bg-sky-400/10',
    },
    women_doubles: {
        label: '여복',
        textClass: 'text-violet-600 dark:text-violet-400',
        borderClass: 'border-violet-600/40 dark:border-violet-400/40',
        bgClass: 'bg-violet-600/10 dark:bg-violet-400/10',
    },
    mixed_doubles: {
        label: '혼복',
        textClass: 'text-amber-600 dark:text-amber-400',
        borderClass: 'border-amber-600/40 dark:border-amber-400/40',
        bgClass: 'bg-amber-600/10 dark:bg-amber-400/10',
    },
}

export function getMatchTypeStyle(type: MatchType): MatchTypeStyle {
    return STYLES[type]
}

export const MATCH_TYPE_LABELS: Record<MatchType, string> = {
    singles: STYLES.singles.label,
    men_doubles: STYLES.men_doubles.label,
    women_doubles: STYLES.women_doubles.label,
    mixed_doubles: STYLES.mixed_doubles.label,
}

export function getMatchTypeBadgeClass(type: MatchType): string {
    const s = STYLES[type]
    return `${s.borderClass} ${s.textClass} ${s.bgClass}`
}

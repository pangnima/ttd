import type { MatchType } from '@/types'

type MatchTypeStyle = {
    label: string
    textClass: string
    borderClass: string
    bgClass: string
}

// 경기 타입은 '결과'가 아닌 '카테고리' 태그 — win(민트)/loss(코랄) 결과 시맨틱과 겹치지 않도록
// 카테고리 팔레트(cat-*)에 앵커한다. 네 타입 모두 같은 방식으로 통일 (docs/color-system.md).
const STYLES: Record<MatchType, MatchTypeStyle> = {
    singles: {
        label: '단식',
        textClass: 'text-cat-1',
        borderClass: 'border-cat-1/40',
        bgClass: 'bg-cat-1/10',
    },
    men_doubles: {
        label: '남복',
        textClass: 'text-cat-8',
        borderClass: 'border-cat-8/40',
        bgClass: 'bg-cat-8/10',
    },
    women_doubles: {
        label: '여복',
        textClass: 'text-cat-5',
        borderClass: 'border-cat-5/40',
        bgClass: 'bg-cat-5/10',
    },
    mixed_doubles: {
        label: '혼복',
        textClass: 'text-cat-4',
        borderClass: 'border-cat-4/40',
        bgClass: 'bg-cat-4/10',
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

// 경기 타입 Select 입력용 옵션 — 개인/클럽 폼 양쪽이 공유 (표시 순서 고정)
export const MATCH_TYPE_OPTIONS: { value: MatchType; label: string }[] = [
    { value: 'singles', label: STYLES.singles.label },
    { value: 'men_doubles', label: STYLES.men_doubles.label },
    { value: 'women_doubles', label: STYLES.women_doubles.label },
    { value: 'mixed_doubles', label: STYLES.mixed_doubles.label },
]

export function getMatchTypeBadgeClass(type: MatchType): string {
    const s = STYLES[type]
    return `${s.borderClass} ${s.textClass} ${s.bgClass}`
}

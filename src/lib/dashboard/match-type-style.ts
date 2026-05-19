import type { MatchType } from '@/types'

type MatchTypeStyle = {
    label: string
    textClass: string
    borderClass: string
    bgClass: string
}

const STYLES: Record<MatchType, MatchTypeStyle> = {
    singles: {
        label: '단식',
        textClass: 'text-cyan-400/80',
        borderClass: 'border-cyan-400/40',
        bgClass: 'bg-cyan-400/8',
    },
    men_doubles: {
        label: '남복',
        textClass: 'text-blue-400/80',
        borderClass: 'border-blue-400/40',
        bgClass: 'bg-blue-400/8',
    },
    women_doubles: {
        label: '여복',
        textClass: 'text-purple-400/80',
        borderClass: 'border-purple-400/40',
        bgClass: 'bg-purple-400/8',
    },
    mixed_doubles: {
        label: '혼복',
        textClass: 'text-amber-400/80',
        borderClass: 'border-amber-400/40',
        bgClass: 'bg-amber-400/8',
    },
}

export function getMatchTypeStyle(type: MatchType): MatchTypeStyle {
    return STYLES[type]
}

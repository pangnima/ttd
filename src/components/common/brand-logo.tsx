import { cn } from '@/lib/utils'

/**
 * 브랜드 로고 — 라임 배지형 코트 아이콘 + 워드마크.
 * 아이콘은 자체 배경(라임)을 가져 라이트/다크 어디서나 동일하게 보이고,
 * 워드마크 색은 currentColor(부모 text-*)로 상속. 워드마크 글꼴은 Geist Mono 고정.
 */
type BrandLogoProps = {
    wordmark?: boolean
    size?: 'sm' | 'md'
    className?: string
}

const SIZE = {
    sm: { ball: 'size-6', text: 'text-body' },
    md: { ball: 'size-8', text: 'text-h4' },
} as const

// 워드마크 — Geist Mono 고정(--font-mono는 Pretendard 우선이라 변수를 직접 지정).
// leading-none(line-height:1) + mt-[3px]로 모노 대문자의 높은 광학 중심을 보정해 아이콘과 수직 정렬을 맞춘다.
export const WORDMARK_CLASS = 'font-[family-name:var(--font-geist-mono)] font-extrabold tracking-tight leading-none mt-[3px]'

export function BrandLogo({ wordmark = true, size = 'md', className }: BrandLogoProps) {
    const s = SIZE[size]
    return (
        <span className={cn('inline-flex items-center gap-2.5', className)}>
            {/* 라임 배지 + 다크 잉크 코트 라인 (테마 무관 동일 표현) */}
            <svg viewBox="0 0 48 48" className={s.ball} aria-hidden="true">
                <rect width="48" height="48" rx="11.3" className="fill-accent-lime" />
                <g transform="translate(7,7) scale(0.708)">
                    {/* 싱글스 세로 라인 */}
                    <line x1="14.4" y1="4" x2="14.4" y2="44" className="stroke-accent-lime-foreground" strokeWidth="1.1" opacity=".34" />
                    <line x1="33.6" y1="4" x2="33.6" y2="44" className="stroke-accent-lime-foreground" strokeWidth="1.1" opacity=".34" />
                    {/* 코트 사각형 + 네트 + 상·하 베이스라인 */}
                    <rect x="11" y="4" width="26" height="40" fill="none" className="stroke-accent-lime-foreground" strokeWidth="2" />
                    <line x1="11" y1="24" x2="37" y2="24" className="stroke-accent-lime-foreground" strokeWidth="1.8" />
                    <line x1="11" y1="4" x2="37" y2="4" className="stroke-accent-lime-foreground" strokeWidth="3" />
                    <line x1="11" y1="44" x2="37" y2="44" className="stroke-accent-lime-foreground" strokeWidth="3" />
                    {/* 테니스공 궤도 */}
                    <path
                        d="M15 39 Q28 27 30 14"
                        fill="none"
                        className="stroke-accent-lime-foreground"
                        strokeWidth="1.8"
                        strokeDasharray="2.4 3.1"
                        strokeLinecap="round"
                        opacity=".5"
                    />
                    {/* 테니스공 */}
                    <circle cx="30" cy="13.5" r="9" fill="none" className="stroke-accent-lime-foreground" strokeWidth="1.3" opacity=".26" />
                    <circle cx="30" cy="13.5" r="5.6" fill="none" className="stroke-accent-lime-foreground" strokeWidth="1.3" opacity=".55" />
                    <circle cx="30" cy="13.5" r="3.6" className="fill-accent-lime-foreground stroke-accent-lime" strokeWidth="0.9" />
                </g>
            </svg>
            {wordmark ? <span className={cn(WORDMARK_CLASS, s.text)}>BASELINE</span> : null}
        </span>
    )
}

import { cn } from '@/lib/utils'

/**
 * Baseline 브랜드 로고 — 라임 테니스공 아이콘 + BASELINE 워드마크.
 * 다크/라이트 패널 어디서나 쓰이도록 워드마크 색은 currentColor(부모 text-*)로 상속.
 */
type BrandLogoProps = {
    wordmark?: boolean
    size?: 'sm' | 'md'
    className?: string
}

const SIZE = {
    sm: { ball: 'size-6', text: 'text-base' },
    md: { ball: 'size-8', text: 'text-lg' },
} as const

export function BrandLogo({ wordmark = true, size = 'md', className }: BrandLogoProps) {
    const s = SIZE[size]
    return (
        <span className={cn('inline-flex items-center gap-2.5', className)}>
            <svg viewBox="0 0 32 32" className={s.ball} aria-hidden="true">
                <circle cx="16" cy="16" r="15" className="fill-accent-lime" />
                {/* 테니스공 시접 곡선 */}
                <path
                    d="M6 6 C13 11 13 21 6 26"
                    className="stroke-accent-lime-foreground"
                    fill="none"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                />
                <path
                    d="M26 6 C19 11 19 21 26 26"
                    className="stroke-accent-lime-foreground"
                    fill="none"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                />
            </svg>
            {wordmark ? (
                <span className={cn('font-extrabold tracking-tight', s.text)}>BASELINE</span>
            ) : null}
        </span>
    )
}

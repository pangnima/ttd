import type { ReactNode } from 'react'
import { CARD_BASE, TYPO } from '@/lib/dashboard/tokens'
import { cn } from '@/lib/utils'

/** 색 톤 — 뜻은 color-system §4: spot = 주의·대기, primary = 안내, win = 완료, muted = 잠금·보조, neutral = 무채 */
export type NoticeTone = 'spot' | 'primary' | 'win' | 'muted' | 'neutral'

type Props = {
    tone?: NoticeTone
    /** card = 화면 상단 배너(제목 + 본문). inline = 폼 안 한 문단(아이콘 + 본문) */
    variant?: 'card' | 'inline'
    /** 크기·색을 넣은 lucide 아이콘(`w-4 h-4 text-spot shrink-0 mt-0.5`) — 톤마다 색이 달라 호출부가 든다 */
    icon?: ReactNode
    title?: ReactNode
    children?: ReactNode
    className?: string
}

const CARD_TONE: Record<NoticeTone, string> = {
    spot: 'border-spot/40',
    primary: 'border-primary/40',
    win: 'border-win/40 bg-win/10',
    muted: 'border-border bg-muted/40',
    neutral: '',
}
const INLINE_TONE: Record<NoticeTone, string> = {
    spot: 'border-spot/40 bg-spot/10',
    primary: 'border-primary/30 bg-primary/5',
    win: 'border-win/40 bg-win/10',
    muted: 'border-border bg-muted/40',
    neutral: 'border-border',
}

/**
 * 안내 카드 — 열한 개 `*-notice.tsx`가 두 골격(카드형·인라인형)의 색·문구 변주였던 것을 하나로(Week 69).
 * 문구와 노출 조건은 각 notice 파일이 그대로 쥔다. 여기는 모양만.
 */
export function Notice({ tone = 'spot', variant = 'card', icon, title, children, className }: Props) {
    if (variant === 'inline') {
        return (
            <div className={cn('flex items-start gap-2.5 rounded-lg border px-3 py-2.5', INLINE_TONE[tone], className)}>
                {icon}
                <p className="text-caption text-muted-foreground break-keep">{children}</p>
            </div>
        )
    }
    return (
        <div className={cn(CARD_BASE, 'px-4 py-3', CARD_TONE[tone], icon && 'flex items-start gap-2.5', className)}>
            {icon}
            <div className="min-w-0">
                {title && <p className={`${TYPO.body2} font-medium break-keep`}>{title}</p>}
                {children && <p className={cn(TYPO.caption, title && 'mt-1', 'break-keep')}>{children}</p>}
            </div>
        </div>
    )
}

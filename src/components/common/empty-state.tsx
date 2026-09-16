import type { ReactNode } from 'react'
import { EMPTY_BLOCK } from '@/lib/dashboard/tokens'
import { cn } from '@/lib/utils'

type Props = {
    /** `/empty/*.svg` 장식 — next/image는 SVG에 이점이 없어 `<img>` (tier-icon 관례) */
    image?: string
    title: ReactNode
    description?: ReactNode
    /** 제목·설명 아래 슬롯(장식 칩 등) */
    children?: ReactNode
    /** CTA 링크들 — 있으면 가로로 나란히 */
    actions?: ReactNode
    /** md = 섹션 전체가 빈 큰 자리(그림 132×96·py-12), sm = 카드 안·목록 자리(96×64) */
    size?: 'sm' | 'md'
    className?: string
}

/**
 * 빈 상태 — `EMPTY_BLOCK`을 손으로 조립하던 일곱 자리를 하나로(Week 69). 그림이 없으면 문구만 가운데 둔다.
 */
export function EmptyState({ image, title, description, children, actions, size = 'sm', className }: Props) {
    const md = size === 'md'
    return (
        <div className={cn(EMPTY_BLOCK, 'flex flex-col items-center justify-center', md ? 'gap-4 py-12' : 'gap-3', className)}>
            {image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="" aria-hidden width={md ? 132 : 96} height={md ? 96 : 64} draggable={false} />
            )}
            <div className="space-y-1">
                <p className={md ? 'text-body font-medium text-foreground' : undefined}>{title}</p>
                {description && <p className={md ? 'text-body2 text-muted-foreground' : 'text-caption'}>{description}</p>}
            </div>
            {children}
            {actions && <div className="flex flex-wrap items-center justify-center gap-2">{actions}</div>}
        </div>
    )
}

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { TYPO } from '@/lib/dashboard/tokens'

type PageHeaderProps = {
    /** 페이지 대제목 (H1) — 페이지당 하나 */
    title: ReactNode
    /** 제목 아래 한 줄 설명 (Body2 muted) */
    description?: ReactNode
    /** 제목 위 소형 대문자 라벨 (eyebrow) */
    eyebrow?: ReactNode
    /** 우측 액션 영역 (버튼 등) — 좁은 화면에서는 아래로 감싼다 */
    actions?: ReactNode
    className?: string
}

/**
 * 페이지 최상단 헤더 공용 컴포넌트.
 * h1 = TYPO.h1(28→36px clamp)로 고정해 페이지별 사이즈·굵기 편차를 없앤다.
 * 레이아웃(PageContainer)과 역할을 분리 — 이 컴포넌트는 제목 블록만 담당.
 */
export function PageHeader({ title, description, eyebrow, actions, className }: PageHeaderProps) {
    return (
        <div className={cn('flex flex-wrap items-start justify-between gap-3', className)}>
            <div className="min-w-0">
                {eyebrow && <p className={TYPO.eyebrow}>{eyebrow}</p>}
                <h1 className={cn(TYPO.h1, 'break-keep', eyebrow && 'mt-2')}>{title}</h1>
                {description && <p className={cn(TYPO.body2Muted, 'mt-1 break-keep')}>{description}</p>}
            </div>
            {actions && <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
    )
}

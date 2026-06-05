import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

type PageContainerProps = {
    children: ReactNode
    /** 특수한 경우에만 세로 리듬 등 보강 (기본 space-y-6) */
    className?: string
}

/**
 * 페이지 콘텐츠 공용 컨테이너.
 * '내 분석' 페이지 기준: full-width + 루트 세로 리듬 space-y-6.
 * 폭 제한(max-w)·중앙 정렬(mx-auto) 없이 레이아웃의 p-4 md:p-6 패딩에만 의존.
 */
export function PageContainer({ children, className }: PageContainerProps) {
    return <div className={cn('space-y-6', className)}>{children}</div>
}

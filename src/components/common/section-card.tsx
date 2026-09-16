import { CARD_BASE, TYPO } from '@/lib/dashboard/tokens'
import { EmptyState } from '@/components/common/empty-state'
import type { ReactNode } from 'react'

type Props = {
    /** 섹션 제목 */
    title: string
    /** 데이터가 없을 때 보여줄 빈 상태 문구 */
    emptyMessage?: string
    /** 빈 상태에 문구 위로 표시할 일러스트 SVG 경로 (예: '/empty/rivals.svg') */
    emptyImage?: string
    /** 비어있는지 여부 */
    isEmpty?: boolean
    /** 데이터가 있을 때 렌더할 콘텐츠 */
    children: ReactNode
    /** 제목 옆에 렌더할 부가 요소 (예: 전체보기 링크) */
    headerRight?: ReactNode
    /** 카드 내부 패딩 클래스 (기본: p-4) */
    contentClass?: string
}

/**
 * 섹션 제목 + 카드 래퍼 공용 컴포넌트.
 * analytics 카드들의 반복되는 <section><p>제목</p><div>...</div></section> 보일러플레이트를 통합.
 */
export function SectionCard({
    title,
    emptyMessage = '데이터가 없습니다',
    emptyImage,
    isEmpty = false,
    children,
    headerRight,
    contentClass = 'p-4',
}: Props) {
    return (
        <section className="space-y-3 h-full flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <h2 className={`${TYPO.h4} shrink-0`}>{title}</h2>
                {headerRight && <div className="ml-auto">{headerRight}</div>}
            </div>
            {isEmpty ? (
                <EmptyState image={emptyImage} title={emptyMessage} className="flex-1" />
            ) : (
                <div className={`${CARD_BASE} ${contentClass} flex-1`}>{children}</div>
            )}
        </section>
    )
}

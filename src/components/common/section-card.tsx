import { CARD_BASE, SECTION_LABEL, EMPTY_BLOCK } from '@/lib/dashboard/tokens'
import type { ReactNode } from 'react'

type Props = {
    /** 섹션 제목 */
    title: string
    /** 데이터가 없을 때 보여줄 빈 상태 문구 */
    emptyMessage?: string
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
    isEmpty = false,
    children,
    headerRight,
    contentClass = 'p-4',
}: Props) {
    return (
        <section className="space-y-3 h-full flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <p className={`${SECTION_LABEL} shrink-0`}>{title}</p>
                {headerRight && <div className="ml-auto">{headerRight}</div>}
            </div>
            {isEmpty ? (
                <div className={`${EMPTY_BLOCK} flex-1 flex items-center justify-center`}>{emptyMessage}</div>
            ) : (
                <div className={`${CARD_BASE} ${contentClass} flex-1`}>{children}</div>
            )}
        </section>
    )
}

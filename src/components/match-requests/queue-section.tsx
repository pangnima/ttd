import type { ReactNode } from 'react'
import { CARD_BASE, TYPO } from '@/lib/dashboard/tokens'

type Props = {
    title: string
    /** 이 섹션이 무엇을 요구하는지 한 줄 안내 (선택) */
    hint?: string
    /** 0이면 섹션 자체를 렌더하지 않는다 — 허브는 '할 일이 있는 것만' 보여준다 */
    count: number
    children: ReactNode
}

/** 확인 요청 허브의 섹션 껍데기 — 제목 + 카드 리스트 컨테이너 */
export function QueueSection({ title, hint, count, children }: Props) {
    if (count === 0) return null
    return (
        <section className="space-y-2">
            <div className="flex items-baseline gap-2 flex-wrap">
                <h2 className={TYPO.h3}>{title}</h2>
                <span className="text-caption text-muted-foreground">{count}건{hint && ` · ${hint}`}</span>
            </div>
            <div className={`${CARD_BASE} divide-y divide-border`}>{children}</div>
        </section>
    )
}

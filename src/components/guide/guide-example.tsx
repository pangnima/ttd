import type { ReactNode } from 'react'

import { TYPO } from '@/lib/dashboard/tokens'
import { cn } from '@/lib/utils'
import { GuideText } from '@/components/guide/guide-text'

type Props = {
    /** 그림 아래 한 줄 — inert 안은 접근성 트리에서 빠지므로 **이 문장이 곧 그림의 설명**이다 */
    caption?: string
    children: ReactNode
}

/**
 * 가이드의 예시 그림 래퍼(Week 58) — 실제 카드·배지 컴포넌트를 더미 데이터로 그린 것을 감싼다.
 *
 * `inert`(React 19 boolean)가 클릭·포커스·선택·접근성 트리를 한 번에 끊어 예시 안의 링크·버튼이
 * 눌리지 않는다 — 「눌러도 안 되는 버튼」이 아니라 「누를 수 없는 그림」이다. `aria-hidden`과
 * `pointer-events-none`은 inert를 모르는 구형 브라우저의 폴백(그때는 Tab 포커스만 남는다).
 */
export function GuideExample({ caption, children }: Props) {
    return (
        <figure className="mt-5 space-y-2">
            <figcaption className={TYPO.eyebrow}>예시</figcaption>
            <div inert aria-hidden className="pointer-events-none select-none">
                {children}
            </div>
            {caption && (
                <p className={cn(TYPO.caption, 'break-keep')}>
                    <GuideText text={caption} />
                </p>
            )}
        </figure>
    )
}

import type { ReactNode } from 'react'
import { TYPO } from '@/lib/dashboard/tokens'

type Props = {
    title: string
    /** 이 그룹 안 섹션들의 카드 수 합 — 0이면 헤딩만 감춘다 */
    count: number
    children: ReactNode
}

/**
 * 탭 안에서 섹션들을 축으로 묶는 헤딩 래퍼.
 *
 * 허브 탭은 차례와 행위로 갈리는데(승인 요청 / 경기 확정 대기 / 상대 승인 대기 / 이의 처리),
 * 탭 안에는 여전히 다른 축이 남는다. 규칙은 한 문장이다:
 * **각 탭은 그 탭이 가르지 않은 축으로 안에서 묶는다.**
 *
 * ⚠ `QueueSection`과 달리 **count가 0이어도 children을 감추지 않는다.** 숫자로 자식을 숨기는 구조는
 * 숫자가 틀리는 순간 카드가 통째로 사라지는데(그게 「결과 입력 대기」로 탭이 백지가 되던 결함이었다),
 * 그 실패 모드를 한 층 위에 복제할 이유가 없다. 여기서는 숫자가 틀려도 **헤딩만** 사라진다.
 */
export function HubSectionGroup({ title, count, children }: Props) {
    return (
        <div className="space-y-3">
            {count > 0 && (
                <p className={`${TYPO.eyebrow} pt-1`}>{title} <span className="tabular-nums">{count}건</span></p>
            )}
            {children}
        </div>
    )
}

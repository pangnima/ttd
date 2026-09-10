import type { ReactNode } from 'react'
import { ATTENTION_PILL, CARD_BASE, TYPO } from '@/lib/dashboard/tokens'

type Props = {
    /** '1라운드 · 10:00' — 시각은 알 때만 붙는다 */
    title: string
    /** 그 라운드에 한 번도 안 뛴 사람 — 게임별로 세면 1번 코트에서 쉬고 2번 코트에서 뛰는 사람이 쉰 것처럼 읽힌다 */
    restingNames: string[]
    children: ReactNode
}

/**
 * 동시에 도는 경기 한 묶음 (Week 44).
 *
 * 그룹핑은 **감싸기**다 — 기존 게임 카드를 그대로 두고 머리줄만 씌운다.
 * 2면 이상인 방에서 `게임 1, 2, 3…`이 일렬로 늘어서면 어느 둘이 같은 시각에 도는지 알 수 없다.
 */
export function LineupRoundGroup({ title, restingNames, children }: Props) {
    return (
        <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
                <span className={TYPO.eyebrow}>{title}</span>
                {restingNames.length > 0 && (
                    <span className={`${TYPO.caption} break-keep text-right min-w-0`}>
                        <span className={`${ATTENTION_PILL} mr-1.5`}>쉼</span>
                        {restingNames.join(', ')}
                    </span>
                )}
            </div>
            <ol className={`${CARD_BASE} divide-y divide-border`}>{children}</ol>
        </div>
    )
}

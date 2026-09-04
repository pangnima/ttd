import { Flame, Swords } from 'lucide-react'

// 대진표 특별 매치 강조 칩.
//  - 명승부(close): 스코어가 박빙인 접전 → 앰버.
//  - 라이벌(rival): 양측 누적 전적이 박빙인 라이벌 매치 → 로즈.
// '내 경기' 강조(spot)와 색을 분리해 혼동을 피한다.
type SpecialMatchBadgeProps = {
    close?: boolean
    rival?: boolean
}

const CHIP_BASE = 'inline-flex items-center gap-0.5 text-micro leading-none px-1.5 py-0.5 rounded-full border font-medium'

export function SpecialMatchBadge({ close, rival }: SpecialMatchBadgeProps) {
    if (!close && !rival) return null
    return (
        <span className="inline-flex items-center gap-1">
            {rival && (
                <span className={`${CHIP_BASE} border-cat-7/40 text-cat-7 bg-cat-7/10`}>
                    <Swords className="w-2.5 h-2.5" />
                    라이벌
                </span>
            )}
            {close && (
                <span className={`${CHIP_BASE} border-spot/40 text-spot bg-spot/10`}>
                    <Flame className="w-2.5 h-2.5" />
                    명승부
                </span>
            )}
        </span>
    )
}

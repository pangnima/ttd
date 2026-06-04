import { Medal } from 'lucide-react'
import { TEXT_MUTED } from '@/lib/dashboard/tokens'

/** 1~3위: 메달 색상, 4위 이상: 순번 숫자 */
const RANK_COLORS = ['text-yellow-500', 'text-slate-400', 'text-amber-600']

type Props = {
    /** 0-based 인덱스 */
    index: number
    /** 메달 아이콘 크기 클래스 (기본: w-4 h-4) */
    iconClass?: string
    /** 숫자 텍스트 크기 클래스 (기본: text-sm) */
    textClass?: string
}

/**
 * 랭킹 순위 배지 공용 컴포넌트.
 * 1~3위는 메달 아이콘, 4위 이상은 숫자를 표시한다.
 * activity-ranking-card / win-rate-ranking-card 양쪽에서 공유.
 */
export function RankBadge({ index, iconClass = 'w-4 h-4', textClass = 'text-sm' }: Props) {
    if (index < 3) {
        return <Medal className={`${iconClass} ${RANK_COLORS[index]}`} />
    }
    return <span className={`font-medium ${textClass} ${TEXT_MUTED}`}>{index + 1}</span>
}

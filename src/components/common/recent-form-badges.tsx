import { FORM_BADGE_STYLE } from '@/lib/dashboard/outcome'
import { cn } from '@/lib/utils'

type Outcome = 'W' | 'L' | 'D'

const SIZE_CLASS = {
    sm: 'w-4 h-4 rounded-[3px] text-micro',
    md: 'w-5 h-5 rounded-sm text-micro',
} as const

type Props = {
    /** 최근 경기 결과(최신순 등 호출부 정렬 그대로 렌더) */
    outcomes: Outcome[]
    /** 배지 크기 (sm=라이벌 행, md=랭킹 카드) */
    size?: keyof typeof SIZE_CLASS
    /** 컨테이너 추가 클래스 */
    className?: string
}

/**
 * 최근 경기 폼 배지 묶음(W/L/D). FORM_BADGE_STYLE 색을 공유한다.
 * H2H 상세 패널은 별도 스타일 체계(H2H_OUTCOME_STYLE)라 이 컴포넌트를 쓰지 않는다.
 */
export function RecentFormBadges({ outcomes, size = 'md', className }: Props) {
    return (
        <div className={cn('flex items-center gap-1', className)}>
            {outcomes.map((o, i) => (
                <span
                    key={i}
                    className={`${SIZE_CLASS[size]} font-bold flex items-center justify-center ${FORM_BADGE_STYLE[o]}`}
                >
                    {o}
                </span>
            ))}
        </div>
    )
}

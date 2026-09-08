import type { PersonalMatchConfirmation } from '@/types'
import { PILL_BASE } from '@/lib/dashboard/tokens'
import { formatConfirmProgress } from '@/lib/personal-matches/confirmation'

type Props = { confirmation?: PersonalMatchConfirmation; title?: string }

/**
 * 결과 확인 진행도 배지 '2/4명 확인' (0060 만장일치). 참여 축의 SeatProgressBadge와 같은 토큰을 쓴다.
 * 단식은 진행도라는 개념이 없어(빈 문자열) 렌더하지 않는다.
 */
export function ResultConfirmProgressBadge({ confirmation, title }: Props) {
    const label = formatConfirmProgress(confirmation)
    if (!label) return null
    return (
        <span className={`${PILL_BASE} border border-border text-muted-foreground tabular-nums`} title={title}>
            {label}
        </span>
    )
}

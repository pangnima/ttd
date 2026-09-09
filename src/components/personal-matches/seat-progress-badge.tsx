import { PILL_BASE } from '@/lib/dashboard/tokens'
import { formatAcceptanceProgress, type AcceptanceSeat } from '@/lib/match-requests/participants'

/**
 * 좌석 수락 진행도 배지 '2/3명 수락' — 로테이션 일정 좌석(0057)이 쓴다.
 * 회원이 한 명뿐이면 진행도라는 개념이 없어 빈 문자열이 되고 렌더하지 않는다.
 * (결과 확인 축의 `ResultConfirmProgressBadge`와 같은 토큰을 쓴다.)
 */
export function SeatProgressBadge({ seats }: { seats: AcceptanceSeat[] }) {
    const label = formatAcceptanceProgress(seats)
    if (!label) return null
    return <span className={`${PILL_BASE} border border-border text-muted-foreground tabular-nums`}>{label}</span>
}

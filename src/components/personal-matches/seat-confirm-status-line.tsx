import type { PersonalMatchConfirmation } from '@/types'
import type { NamedSeat } from '@/lib/personal-matches/confirmation'
import {
    confirmSeatStatuses, groupSeatNames, seatStateLabel, shouldShowSeatStatuses,
} from '@/lib/personal-matches/seat-status'
import { NameStatusLine } from '@/components/common/name-status-line'

type Props = {
    confirmation?: PersonalMatchConfirmation
    /** 관점 행의 다른 좌석(파트너·상대1·상대2) — labels.ts namedSeatsOf / 룸 행의 참가자 목록 */
    seats: NamedSeat[]
    className?: string
}

/**
 * 결과 확인의 좌석 명단 — '입력: A / 확인 완료: 나 / 확인 대기: B · C'.
 *
 * 진행도 배지(`ResultConfirmProgressBadge`)가 숫자로 말하던 것을 이름으로 말한다. 배지는 그대로 두고
 * 이 줄을 아래에 얹는다 — 배지는 한 줄에 여러 개가 나란히 서는 자리라 이름이 들어가면 넘친다.
 *
 * 렌더 여부 판정을 스스로 하므로(제안 중일 때만) 호출부에 조건문이 생기지 않는다.
 */
export function SeatConfirmStatusLine({ confirmation, seats, className }: Props) {
    if (!shouldShowSeatStatuses(confirmation) || !confirmation) return null
    const groups = groupSeatNames(confirmSeatStatuses(confirmation, seats))
        .map((g) => ({ label: seatStateLabel(g.state), names: g.names }))
    return <NameStatusLine groups={groups} className={className} />
}

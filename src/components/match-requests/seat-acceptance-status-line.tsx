import {
    acceptanceStateLabel, groupAcceptanceNames, type NamedAcceptanceSeat,
} from '@/lib/match-requests/participants'
import { NameStatusLine } from '@/components/common/name-status-line'

type Props = { seats: NamedAcceptanceSeat[]; className?: string }

/**
 * 참여 수락의 좌석 명단 — '수락: A / 응답 대기: B'.
 *
 * `SeatProgressBadge`가 '2/3명 수락'이라는 숫자로 말하던 것을 이름으로 말한다. 배지는 그대로 두고
 * 이 줄을 아래에 얹는다. 결과 축의 형제는 `SeatConfirmStatusLine`이고 형식이 같다.
 */
export function SeatAcceptanceStatusLine({ seats, className }: Props) {
    const groups = groupAcceptanceNames(seats)
        .map((g) => ({ label: acceptanceStateLabel(g.state), names: g.names }))
    return <NameStatusLine groups={groups} className={className} />
}

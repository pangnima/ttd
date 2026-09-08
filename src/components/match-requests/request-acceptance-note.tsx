import type { MatchRequest } from '@/types'
import { PILL_BASE } from '@/lib/dashboard/tokens'
import {
    formatAcceptanceProgress, pendingMemberCount, requiresAllMembers, type AcceptanceSeat,
} from '@/lib/match-requests/participants'
import { SeatAcceptanceStatusLine } from '@/components/match-requests/seat-acceptance-status-line'

type Props = { request: MatchRequest }

/**
 * 좌석 진행도 배지의 알맹이 — 요청 좌석(0056)과 로테이션 일정 좌석(0057)이 공유한다.
 * 회원이 한 명뿐이면 진행도라는 개념이 없으므로 빈 문자열이 되어 렌더하지 않는다.
 */
export function SeatProgressBadge({ seats }: { seats: AcceptanceSeat[] }) {
    const label = formatAcceptanceProgress(seats)
    if (!label) return null
    return (
        <span className={`${PILL_BASE} border border-border text-muted-foreground tabular-nums`}>{label}</span>
    )
}

/**
 * 참여 수락 진행도 배지 — 방 밖 요청에서 회원이 둘 이상일 때만 뜬다(0056).
 * 룸 요청은 입장이 곧 동의라 진행도라는 개념이 없다.
 */
export function AcceptanceProgressBadge({ request }: Props) {
    if (!requiresAllMembers(request)) return null
    return <SeatProgressBadge seats={request.seats} />
}

/**
 * 좌석 명단 '수락: A / 응답 대기: B' — 배지와 같은 게이트를 쓴다(방 밖 요청만).
 * 숫자 배지만으로는 **누구를 기다리는지** 알 수 없어 재촉할 대상을 특정할 수 없었다.
 */
export function RequestAcceptanceStatusLine({ request, className }: Props & { className?: string }) {
    if (!requiresAllMembers(request)) return null
    return <SeatAcceptanceStatusLine seats={request.seats} className={className} />
}

/** 수락 전 안내 문구 — 전원 수락 모델인지, 대표 1명 모델인지에 따라 갈린다 */
export function AcceptanceNote({ request }: Props) {
    if (!requiresAllMembers(request)) {
        return (
            <p className="text-caption text-muted-foreground break-keep">
                수락하면 양쪽 기록에 함께 추가되며 이후 수정할 수 없습니다. 결과는 게임 스코어 등록 시 확정됩니다.
            </p>
        )
    }

    const remaining = pendingMemberCount(request.seats)
    return (
        <p className="text-caption text-muted-foreground break-keep">
            회원 참가자 전원이 수락해야 모두의 기록에 추가됩니다
            {remaining > 1 && ` (내 응답 외 ${remaining - 1}명 남음)`}. 기록이 만들어지면 수정·삭제할 수 없고,
            결과는 회원 참가자 전원이 확인하면 확정됩니다.
        </p>
    )
}

/** 내 응답이 끝난 뒤 대기 화면용 문구 */
export function AwaitingMembersNote({ request }: Props) {
    const remaining = pendingMemberCount(request.seats)
    return (
        <p className="text-caption text-muted-foreground break-keep">
            내 수락은 끝났습니다. 남은 참가자 {remaining}명이 수락하면 모두의 기록에 추가됩니다.
        </p>
    )
}

/**
 * 로테이션 **일정**(경기 전) 초대 문구 (0057). 요청 문구와 달리 '기록에 추가'라고 말하지 않는다 —
 * 이 시점에는 게임이 하나도 없고, 수락은 "그 시간에 이 사람들과 친다"는 동의다.
 */
export function SessionPlanNote(
    { readOnly, remaining, isOwner }: { readOnly?: boolean; remaining: number; isOwner?: boolean },
) {
    return (
        <p className="text-caption text-muted-foreground break-keep">{sessionPlanText(readOnly, remaining, isOwner)}</p>
    )
}

/**
 * 0064로 '전원 수락 전에는 결과를 입력할 수 없다'가 되면서 이 문구가 네 갈래가 됐다.
 * ⚠ 주최자에게 "참여를 수락했습니다"라고 말하면 안 된다 — 초대를 **보낸** 사람이다.
 * 주최자가 이 카드를 보는 것 자체가 0064의 신설 경로(awaitSeats)라 종전 문구에는 이 갈래가 없었다.
 */
function sessionPlanText(readOnly: boolean | undefined, remaining: number, isOwner: boolean | undefined): string {
    if (!readOnly) {
        return '수락하면 이 일정이 내 화면에도 표시되고, 경기 후 결과를 직접 입력할 수 있습니다. 거절하면 나만 참가자 명단에서 빠집니다.'
    }
    if (isOwner) {
        return `초대한 회원 ${remaining}명의 응답을 기다립니다. 전원이 수락해야 결과를 입력할 수 있습니다 — 응답이 없으면 참가자 편집에서 명단에서 빼고 게스트로 기록할 수 있습니다.`
    }
    if (remaining > 0) {
        return `참여를 수락했습니다. 남은 참가자 ${remaining}명이 응답해야 결과를 입력할 수 있습니다.`
    }
    return '참여를 수락했습니다. 경기 후 결과는 참가자 누구든 입력할 수 있습니다.'
}

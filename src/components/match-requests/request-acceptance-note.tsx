import type { MatchRequest } from '@/types'
import { PILL_BASE } from '@/lib/dashboard/tokens'
import {
    formatAcceptanceProgress, pendingMemberCount, requiresAllMembers,
} from '@/lib/match-requests/participants'

type Props = { request: MatchRequest }

/**
 * 참여 수락 진행도 배지 — 방 밖 요청에서 회원이 둘 이상일 때만 뜬다(0056).
 * 룸 요청은 입장이 곧 동의라 진행도라는 개념이 없다.
 */
export function AcceptanceProgressBadge({ request }: Props) {
    if (!requiresAllMembers(request)) return null
    const label = formatAcceptanceProgress(request.seats)
    if (!label) return null
    return (
        <span className={`${PILL_BASE} border border-border text-muted-foreground tabular-nums`}>{label}</span>
    )
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
            결과는 상대팀 대표가 확인하면 확정됩니다.
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

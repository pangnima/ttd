'use client'

import type { OpponentCandidate } from '@/lib/queries/users'
import { RoomGuestDialog } from '@/components/match-rooms/room-guest-dialog'
import { RoomInviteMemberDialog } from '@/components/match-rooms/room-invite-member-dialog'

type Props = {
    roomId: string
    selfUserId: string
    candidates: OpponentCandidate[]
    /** [회원 초대] 후보에서 뺄 회원 — inviteExcludedUserIds가 계산한다 */
    excludedUserIds: string[]
}

/**
 * 참가자 섹션 헤더의 초대 버튼 둘 — 회원과 비회원은 부르는 방식이 다르므로 버튼도 나눈다.
 * 회원은 '초대'(수락하면 비밀번호 없이 참가)이고, 비회원은 수락할 계정이 없어 곧바로 명단에 오른다.
 */
export function RoomInviteMembers({ roomId, selfUserId, candidates, excludedUserIds }: Props) {
    return (
        <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
            <RoomInviteMemberDialog
                roomId={roomId}
                selfUserId={selfUserId}
                candidates={candidates}
                excludedUserIds={excludedUserIds}
            />
            <RoomGuestDialog roomId={roomId} />
        </div>
    )
}

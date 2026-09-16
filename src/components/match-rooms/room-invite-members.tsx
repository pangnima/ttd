'use client'

import type { MatchRoomMember } from '@/types'
import { RoomGuestDialog } from '@/components/match-rooms/room-guest-dialog'
import { RoomInviteMemberDialog } from '@/components/match-rooms/room-invite-member-dialog'

type Props = {
    roomId: string
    selfUserId: string
    /** [회원 초대] 검색 결과 행의 상태(참가·초대 대기·내보내짐…)를 붙이기 위한 명단 */
    members: MatchRoomMember[]
    /** 호스트에게만 참 — 내보낸·나간 사람을 다시 부를 수 있다 */
    canReinvite: boolean
}

/**
 * 참가자 섹션 헤더의 초대 버튼 둘 — 회원과 비회원은 부르는 방식이 다르므로 버튼도 나눈다.
 * 회원은 '초대'(수락하면 비밀번호 없이 참가)이고, 비회원은 수락할 계정이 없어 곧바로 명단에 오른다.
 */
export function RoomInviteMembers({ roomId, selfUserId, members, canReinvite }: Props) {
    return (
        <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
            <RoomInviteMemberDialog roomId={roomId} selfUserId={selfUserId} members={members} canReinvite={canReinvite} />
            <RoomGuestDialog roomId={roomId} />
        </div>
    )
}

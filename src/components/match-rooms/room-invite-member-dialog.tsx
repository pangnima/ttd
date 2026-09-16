'use client'

import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import type { MatchRoomMember } from '@/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RoomInviteMemberForm } from '@/components/match-rooms/room-invite-member-form'

type Props = {
    roomId: string
    selfUserId: string
    members: MatchRoomMember[]
    /** 호스트에게만 참 — 내보낸·나간 사람이 다시 고를 수 있는 행으로 뜬다 */
    canReinvite: boolean
}

/**
 * [회원 초대] — 지목한 회원은 비밀번호를 몰라도 초대 수락만으로 들어온다(0065).
 * 호스트가 열면 내보낸 회원도 고를 수 있는 행으로 뜬다 — 강퇴를 되돌리는 유일한 경로다(0068 §5).
 * 닫히면 언마운트되므로 검색·선택 상태는 다음에 열 때 비어 있다.
 */
export function RoomInviteMemberDialog({ roomId, selfUserId, members, canReinvite }: Props) {
    const [open, setOpen] = useState(false)

    return (
        <>
            <Button size="sm" variant="outline" className="h-7 text-caption gap-1" onClick={() => setOpen(true)}>
                <UserPlus className="size-3.5" />
                회원 초대
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto" showCloseButton={false}>
                    <DialogHeader>
                        <DialogTitle>회원 초대</DialogTitle>
                    </DialogHeader>
                    <RoomInviteMemberForm
                        roomId={roomId}
                        selfUserId={selfUserId}
                        members={members}
                        canReinvite={canReinvite}
                        onDone={() => setOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </>
    )
}

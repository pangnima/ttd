'use client'

import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RoomGuestForm } from '@/components/match-rooms/room-guest-form'

type Props = {
    roomId: string
}

/**
 * [비회원 초대] — 계정 없이 코트에 온 사람을 명단에 올린다(0069).
 * 이름이 곧 정체성이라 수락 단계가 없다: 저장하는 순간 참가자가 되고 자동 대진표의 배치 대상이 된다.
 */
export function RoomGuestDialog({ roomId }: Props) {
    const [open, setOpen] = useState(false)

    return (
        <>
            <Button size="sm" variant="outline" className="h-7 text-caption gap-1" onClick={() => setOpen(true)}>
                <UserPlus className="size-3.5" />
                비회원 초대
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto" showCloseButton={false}>
                    <DialogHeader>
                        <DialogTitle>비회원 초대</DialogTitle>
                    </DialogHeader>
                    <RoomGuestForm roomId={roomId} onDone={() => setOpen(false)} />
                </DialogContent>
            </Dialog>
        </>
    )
}

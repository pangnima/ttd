'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { respondRoomInviteAction } from '@/lib/actions/match-rooms'

type Props = { roomId: string }

/** 초대받은 회원에게 보이는 상단 배너 — 수락하면 참가자, 거절하면 명단에서 빠진다(열람은 비밀번호로 가능) */
export function RoomInviteBanner({ roomId }: Props) {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    const respond = (accept: boolean) =>
        startTransition(async () => {
            setError(null)
            const res = await respondRoomInviteAction(roomId, accept)
            if (res.error) setError(res.error)
        })

    return (
        <div className="rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 flex flex-wrap items-center gap-3">
            <p className="text-body2 font-medium flex-1 min-w-0 break-keep">이 경기에 초대되었습니다. 참가하시겠어요?</p>
            <div className="flex gap-1.5 shrink-0">
                <Button size="sm" className="h-8" disabled={isPending} onClick={() => respond(true)}>참가 수락</Button>
                <Button size="sm" variant="outline" className="h-8" disabled={isPending} onClick={() => respond(false)}>거절</Button>
            </div>
            {error && <p className="w-full text-caption text-destructive">{error}</p>}
        </div>
    )
}

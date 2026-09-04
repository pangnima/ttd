'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { approveRoomJoinAction, rejectRoomJoinAction } from '@/lib/actions/match-rooms'

type Props = { roomId: string; userId: string }

/** 방장 전용 — 풀 합류 신청 승인(세션 풀 추가 + 정원 +1)/거절(열람 멤버로 유지) */
export function RoomJoinRequestActions({ roomId, userId }: Props) {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    const run = (action: (roomId: string, userId: string) => Promise<{ error: string | null }>) =>
        startTransition(async () => {
            setError(null)
            const res = await action(roomId, userId)
            if (res.error) setError(res.error)
        })

    return (
        <span className="flex items-center gap-1.5 shrink-0">
            <Button size="sm" className="h-7 text-caption" disabled={isPending} onClick={() => run(approveRoomJoinAction)}>승인</Button>
            <Button size="sm" variant="outline" className="h-7 text-caption" disabled={isPending} onClick={() => run(rejectRoomJoinAction)}>거절</Button>
            {error && <span className="text-caption text-destructive">{error}</span>}
        </span>
    )
}

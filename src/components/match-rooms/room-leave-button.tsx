'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { leaveMatchRoomAction } from '@/lib/actions/match-rooms'

type Props = { roomId: string }

/**
 * 방 나가기(0054) — 참가자·초대 대기 회원 전용(방장은 '매칭 리스트에서 내리기'를 쓴다).
 * 명단에서만 빠지고 내가 올린 기록은 그대로 남는다. 다시 비밀번호로 입장하면 복귀한다.
 */
export function RoomLeaveButton({ roomId }: Props) {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    function leave() {
        if (!confirm('이 방에서 나갈까요? 내가 올린 기록은 그대로 남고, 참가자 명단에서만 빠집니다.')) return
        setError(null)
        startTransition(async () => {
            const res = await leaveMatchRoomAction(roomId)
            if (res.error) setError(res.error)
            else router.push('/match-rooms')
        })
    }

    return (
        <div className="flex flex-col items-end gap-1">
            <button
                type="button"
                onClick={leave}
                disabled={isPending}
                className="text-caption text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
            >
                방 나가기
            </button>
            {error && <p className="text-caption text-destructive">{error}</p>}
        </div>
    )
}

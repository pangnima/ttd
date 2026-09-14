'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { closeMatchRoomAction, reopenMatchRoomAction } from '@/lib/actions/match-rooms'

type Props = {
    roomId: string
    /** 정산된 방에서만 닫을 수 있다 — RPC room_not_settled의 거울 */
    isSettled: boolean
    /** 이미 닫혔으면 [다시 열기]가 그 자리에 선다 */
    closedAt?: string
}

/**
 * 호스트 전용 [방 닫기] / [다시 열기] (0083).
 *
 * 닫기는 정산 위의 잠금이다 — 결과 정정·게임 추가·초대·대진 편집·기록 수정이 전부 막힌다.
 * 버튼은 정산된 방에서만 보인다(가드와 노출을 함께, 0072). 닫힌 뒤 유일한 탈출구가 [다시 열기]라
 * 같은 자리에 둔다 — 잘못 확정한 결과를 고치려면 여기서 열고 [결과 정정]으로 간다.
 */
export function RoomCloseButton({ roomId, isSettled, closedAt }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    if (!isSettled) return null

    function run(action: () => Promise<{ error: string | null }>) {
        setError(null)
        startTransition(async () => {
            const res = await action()
            if (res.error) setError(res.error)
            else router.refresh()
        })
    }

    function close() {
        if (!confirm('매칭을 마감할까요? 결과 정정을 포함한 모든 수정이 잠기고, 호스트만 다시 열 수 있습니다.')) return
        run(() => closeMatchRoomAction(roomId))
    }

    function reopen() {
        if (!confirm('매칭을 다시 열까요? 참가자가 결과를 정정할 수 있게 됩니다.')) return
        run(() => reopenMatchRoomAction(roomId))
    }

    return (
        <>
            {closedAt
                ? <Button size="sm" variant="outline" disabled={isPending} onClick={reopen}>다시 열기</Button>
                : <Button size="sm" variant="outline" disabled={isPending} onClick={close}>방 닫기</Button>}
            {error && <p className="w-full text-caption text-destructive">{error}</p>}
        </>
    )
}

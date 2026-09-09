'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { removeRoomGuestAction } from '@/lib/actions/match-rooms'
import { TYPO } from '@/lib/dashboard/tokens'
import { Button } from '@/components/ui/button'

type Props = {
    roomId: string
    guestId: string
    name: string
}

const CONFIRM = (name: string) => [
    `${name} 님을 명단에서 뺄까요?`,
    '',
    '· 이미 등록된 경기 기록은 그대로 남습니다(그 경기의 참가자로는 계속 보입니다).',
    '· 자동 대진표의 배치 대상에서만 빠집니다.',
].join('\n')

/**
 * 명단 행의 [빼기] — 방에 등록된 비회원을 명단에서 뺀다(0069).
 * 자격 판정은 canRemoveRoomGuest가 하고 여기서는 실행만 한다.
 * 파괴적 액션이라 네이티브 confirm을 쓴다(RoomMemberHostActions와 통일).
 */
export function RoomGuestRemoveButton({ roomId, guestId, name }: Props) {
    const [pending, start] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    function run() {
        if (!confirm(CONFIRM(name))) return
        setError(null)
        start(async () => {
            const res = await removeRoomGuestAction(roomId, guestId)
            if (res.error) setError(res.error)
            else router.refresh()
        })
    }

    return (
        <span className="flex flex-col items-end gap-0.5">
            <Button
                variant="ghost"
                size="sm"
                className={`h-7 px-2 ${TYPO.caption} hover:text-destructive`}
                onClick={run}
                disabled={pending}
            >
                빼기
            </Button>
            {error && <span className={`${TYPO.caption} text-destructive text-right`}>{error}</span>}
        </span>
    )
}

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { kickRoomMemberAction } from '@/lib/actions/match-rooms'
import { TYPO } from '@/lib/dashboard/tokens'
import { Button } from '@/components/ui/button'

type Props = {
    roomId: string
    userId: string
    name: string
}

const KICK_CONFIRM = (name: string) => [
    `${name} 님을 내보낼까요?`,
    '',
    '· 명단에서 사라지고, 다시 부르려면 방장이 [회원 초대]에서 찾아 초대해야 합니다.',
    '· 이미 등록된 경기 기록과, 그 결과를 확인·이의할 권한은 그대로 남습니다.',
].join('\n')

/**
 * 명단 행의 방장 전용 액션 — [내보내기].
 * 매칭 룸의 파괴적 액션은 네이티브 confirm을 쓴다(RoomHostActions·RoomLeaveButton과 통일).
 * 확인 문구가 강퇴의 세 결과(명단에서 사라짐 · 재입장 불가 · 기록은 남음)를 미리 말한다.
 * 되돌리는 길은 [회원 초대] — 방장이 열면 내보낸 회원이 후보에 다시 뜬다(0068 §5).
 */
export function RoomMemberHostActions({ roomId, userId, name }: Props) {
    const [pending, start] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    function run() {
        if (!confirm(KICK_CONFIRM(name))) return
        setError(null)
        start(async () => {
            const res = await kickRoomMemberAction(roomId, userId)
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
                내보내기
            </Button>
            {error && <span className={`${TYPO.caption} text-destructive text-right`}>{error}</span>}
        </span>
    )
}

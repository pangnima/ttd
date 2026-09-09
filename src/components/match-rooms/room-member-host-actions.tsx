'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { inviteRoomMembersAction, kickRoomMemberAction } from '@/lib/actions/match-rooms'
import { TYPO } from '@/lib/dashboard/tokens'
import { Button } from '@/components/ui/button'

type Props = {
    roomId: string
    userId: string
    name: string
    mode: 'kick' | 'reinvite'
}

const KICK_CONFIRM = (name: string) => [
    `${name} 님을 내보낼까요?`,
    '',
    '· 다시 들어오려면 방장이 다시 초대해야 합니다. 비밀번호를 알아도 입장할 수 없습니다.',
    '· 이미 등록된 경기 기록과, 그 결과를 확인·이의할 권한은 그대로 남습니다.',
].join('\n')

/**
 * 명단 행의 방장 전용 액션 — [내보내기] / [다시 초대].
 * 매칭 룸의 파괴적 액션은 네이티브 confirm을 쓴다(RoomHostActions·RoomLeaveButton과 통일).
 * 확인 문구가 강퇴의 두 결과(재입장 불가 · 기록은 남음)를 미리 말한다.
 */
export function RoomMemberHostActions({ roomId, userId, name, mode }: Props) {
    const [pending, start] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    function run() {
        if (mode === 'kick' && !confirm(KICK_CONFIRM(name))) return
        setError(null)
        start(async () => {
            const res = mode === 'kick'
                ? await kickRoomMemberAction(roomId, userId)
                : await inviteRoomMembersAction(roomId, [userId])
            if (res.error) setError(res.error)
            else router.refresh()
        })
    }

    return (
        <span className="flex flex-col items-end gap-0.5">
            <Button
                variant="ghost"
                size="sm"
                className={`h-7 px-2 ${TYPO.caption} ${mode === 'kick' ? 'hover:text-destructive' : 'text-primary'}`}
                onClick={run}
                disabled={pending}
            >
                {mode === 'kick' ? '내보내기' : '다시 초대'}
            </Button>
            {error && <span className={`${TYPO.caption} text-destructive text-right`}>{error}</span>}
        </span>
    )
}

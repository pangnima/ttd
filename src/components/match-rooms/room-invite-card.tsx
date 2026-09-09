'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import type { MatchRoomInvite } from '@/types'
import { Button } from '@/components/ui/button'
import { respondRoomInviteAction } from '@/lib/actions/match-rooms'
import { buildRoomTitle } from '@/lib/match-rooms/title'

type Props = { invite: MatchRoomInvite }

const ROLE_LABEL: Record<string, string> = {
    opponent: '상대로',
    partner: '파트너로',
    opponent2: '상대팀으로',
    pool: '참가자 풀에',
}

/** 확인 요청 허브 '매칭 리스트 초대' 카드 — 방장이 기록에 나를 입력해 자동 초대된 것. 수락하면 방 참가자가 된다 */
export function RoomInviteCard({ invite }: Props) {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    const respond = (accept: boolean) =>
        startTransition(async () => {
            setError(null)
            const res = await respondRoomInviteAction(invite.roomId, accept)
            if (res.error) setError(res.error)
        })

    const role = invite.sourceRole ? ROLE_LABEL[invite.sourceRole] : '참가자로'

    return (
        <div className="px-4 py-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-body2 font-medium text-foreground truncate">{invite.hostName}</p>
                    {invite.hostNickname && <p className="text-caption text-muted-foreground truncate">{invite.hostNickname}</p>}
                    <p className="text-caption text-muted-foreground break-keep">
                        나를 {role} 입력한 경기 ·{' '}
                        <Link href={`/match-rooms/${invite.roomId}`} className="text-primary hover:underline">{buildRoomTitle(invite)}</Link>
                    </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                    <Button size="sm" className="h-7 text-caption" disabled={isPending} onClick={() => respond(true)}>수락</Button>
                    <Button size="sm" variant="outline" className="h-7 text-caption" disabled={isPending} onClick={() => respond(false)}>거절</Button>
                </div>
            </div>
            <p className="text-caption text-muted-foreground break-keep">
                수락하면 방 참가자로 등록됩니다. 경기 기록 자체는 방장 계정에만 남습니다.
            </p>
            {error && <p className="text-caption text-destructive">{error}</p>}
        </div>
    )
}

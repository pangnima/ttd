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

/** 「나를 초대한 매칭」 카드 — 호스트·참가자가 나를 초대한 방. 수락하면 비밀번호 없이 방 참가자가 된다 */
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
                수락하면 방 참가자로 등록됩니다. 방 안 게임은 상대 확인을 거쳐 양쪽 기록에 남습니다.
            </p>
            {error && <p className="text-caption text-destructive">{error}</p>}
        </div>
    )
}

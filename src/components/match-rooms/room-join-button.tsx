'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { requestRoomJoinAction } from '@/lib/actions/match-rooms'

type Props = { roomId: string; requested: boolean }

/** 로테이션 방에서 비밀번호로 입장한 회원의 '풀 합류 신청' — 방장이 승인하면 세션 참가자 풀에 추가된다 */
export function RoomJoinButton({ roomId, requested }: Props) {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    if (requested) {
        return <span className="text-caption text-muted-foreground">합류 신청 — 방장 승인 대기 중</span>
    }

    return (
        <span className="flex items-center gap-2">
            <Button
                size="sm"
                variant="outline"
                className="h-8"
                disabled={isPending}
                onClick={() => startTransition(async () => {
                    setError(null)
                    const res = await requestRoomJoinAction(roomId)
                    if (res.error) setError(res.error)
                })}
            >
                참가자 풀 합류 신청
            </Button>
            {error && <span className="text-caption text-destructive">{error}</span>}
        </span>
    )
}

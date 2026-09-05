'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CARD_BASE, MATCH_FORM_INPUT, MATCH_FORM_LABEL, TYPO } from '@/lib/dashboard/tokens'
import { ROOM_PASSWORD_MAX } from '@/lib/match-rooms/password'
import { enterMatchRoomAction } from '@/lib/actions/match-rooms'

type Props = { roomId: string }

/** 미입장 게이트 — 비밀번호를 맞히면 참가자(player·joined)로 등록되고 페이지가 상세로 다시 렌더된다 */
export function RoomPasswordGate({ roomId }: Props) {
    const router = useRouter()
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        startTransition(async () => {
            const res = await enterMatchRoomAction(roomId, password)
            if (res.error) setError(res.error)
            else router.refresh()
        })
    }

    return (
        <form onSubmit={handleSubmit} className={`${CARD_BASE} p-5 space-y-4 max-w-md`}>
            <div>
                <h2 className={TYPO.h4}>비밀번호를 입력하면 참가자로 등록됩니다</h2>
                <p className="text-caption text-muted-foreground break-keep mt-1">
                    입장하면 바로 이 경기의 참가자가 되고, 참가자 누구나 게임을 등록할 수 있습니다. 명단·메모·게임은 입장 후에 볼 수 있습니다.
                </p>
            </div>
            <div>
                <label htmlFor="room-gate-password" className={MATCH_FORM_LABEL}>입장 비밀번호</label>
                <input
                    id="room-gate-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="off"
                    maxLength={ROOM_PASSWORD_MAX}
                    className={`${MATCH_FORM_INPUT} h-12`}
                    autoFocus
                    required
                />
            </div>
            {error && <p className="text-caption text-destructive">{error}</p>}
            <Button type="submit" disabled={isPending || !password}>{isPending ? '확인 중…' : '입장'}</Button>
        </form>
    )
}

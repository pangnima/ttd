'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MATCH_FORM_INPUT, MATCH_FORM_LABEL } from '@/lib/dashboard/tokens'
import { ROOM_PASSWORD_MAX, ROOM_PASSWORD_MIN } from '@/lib/match-rooms/password'
import { deleteMatchRoomAction, updateRoomPasswordAction } from '@/lib/actions/match-rooms'

type Props = { roomId: string }

/** 방장 전용 — 입장 비밀번호 변경(Dialog) · 리스트에서 내리기(방 삭제, 기록은 유지) */
export function RoomHostActions({ roomId }: Props) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)
    const [isPending, startTransition] = useTransition()

    function changePassword(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        setSaved(false)
        startTransition(async () => {
            const res = await updateRoomPasswordAction(roomId, password)
            if (res.error) setError(res.error)
            else { setSaved(true); setPassword('') }
        })
    }

    function unlist() {
        if (!confirm('경기 리스트에서 내릴까요? 경기 기록은 그대로 남고, 방의 참가자 목록만 사라집니다.')) return
        setError(null)
        startTransition(async () => {
            const res = await deleteMatchRoomAction(roomId)
            if (res.error) setError(res.error)
            else router.push('/match-rooms')
        })
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => { setOpen(true); setSaved(false); setError(null) }}>비밀번호 변경</Button>
            <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" disabled={isPending} onClick={unlist}>
                리스트에서 내리기
            </Button>
            {error && !open && <p className="w-full text-caption text-destructive">{error}</p>}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>입장 비밀번호 변경</DialogTitle>
                        <DialogDescription>이미 입장했거나 참가 중인 회원은 그대로 볼 수 있습니다.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={changePassword} className="space-y-3">
                        <div>
                            <label htmlFor="room-new-password" className={MATCH_FORM_LABEL}>새 비밀번호</label>
                            <input
                                id="room-new-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="new-password"
                                maxLength={ROOM_PASSWORD_MAX}
                                placeholder={`${ROOM_PASSWORD_MIN}~${ROOM_PASSWORD_MAX}자, 공백 없이`}
                                className={`${MATCH_FORM_INPUT} h-12`}
                                required
                            />
                        </div>
                        {error && <p className="text-caption text-destructive">{error}</p>}
                        {saved && <p className="text-caption text-win">비밀번호를 변경했습니다.</p>}
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>닫기</Button>
                            <Button type="submit" disabled={isPending || !password}>변경</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}

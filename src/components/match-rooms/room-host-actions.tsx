'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { FormActions } from '@/components/common/form-actions'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { MATCH_FORM_INPUT, MATCH_FORM_LABEL } from '@/lib/dashboard/tokens'
import { ROOM_PASSWORD_MAX, ROOM_PASSWORD_MIN } from '@/lib/match-rooms/password'
import { closeRotationRoomAction, deleteMatchRoomAction, updateRoomPasswordAction } from '@/lib/actions/match-rooms'
import { RoomCloseButton } from '@/components/match-rooms/room-close-button'

type Props = {
    roomId: string
    /** 미확정 로테이션 방이면 참가자들이 아직 게임을 입력하는 중 — 방장이 닫을 수 있다(0050) */
    canCloseRotation?: boolean
    /** 비노출 방(0082)은 비밀번호가 없다 — [비밀번호 변경]이 없고 '내리기'는 '삭제'다(리스트에 오른 적이 없다) */
    isListed?: boolean
    /** 정산됐으면 [방 닫기], 닫혔으면 [다시 열기] (0083 — RoomCloseButton) */
    isSettled?: boolean
    closedAt?: string
}

/** 방장 전용 — 입장 비밀번호 변경(Dialog) · 게임 입력 종료 · 방 닫기/다시 열기 · 매칭 리스트에서 내리기(방 삭제, 기록은 유지) */
export function RoomHostActions({ roomId, canCloseRotation = false, isListed = true, isSettled = false, closedAt }: Props) {
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
        const prompt = isListed
            ? '매칭 리스트에서 내릴까요? 경기 기록은 그대로 남고, 방의 참가자 목록만 사라집니다.'
            : '매칭을 삭제할까요? 경기 기록은 그대로 남고, 방의 참가자 목록만 사라집니다.'
        if (!confirm(prompt)) return
        setError(null)
        startTransition(async () => {
            const res = await deleteMatchRoomAction(roomId)
            if (res.error) setError(res.error)
            else router.push('/match-rooms')
        })
    }

    function closeRotation() {
        if (!confirm('게임 입력을 종료할까요? 참가자들이 더 이상 게임 빌더로 결과를 넣을 수 없고, 이후에는 방 상세의 [게임 추가]로만 등록합니다.')) return
        setError(null)
        startTransition(async () => {
            const res = await closeRotationRoomAction(roomId)
            if (res.error) setError(res.error)
            else router.refresh()
        })
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            {isListed && (
                <Button size="sm" variant="outline" onClick={() => { setOpen(true); setSaved(false); setError(null) }}>비밀번호 변경</Button>
            )}
            {canCloseRotation && (
                <Button size="sm" variant="outline" disabled={isPending} onClick={closeRotation}>게임 입력 종료</Button>
            )}
            <RoomCloseButton roomId={roomId} isSettled={isSettled} closedAt={closedAt} />
            <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" disabled={isPending} onClick={unlist}>
                {isListed ? '매칭 리스트에서 내리기' : '매칭 삭제'}
            </Button>
            {error && !open && <p className="w-full text-caption text-destructive">{error}</p>}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent showCloseButton={false}>
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
                        <DialogFooter>
                            <FormActions
                                submitLabel="변경"
                                pendingLabel="변경 중…"
                                onCancel={() => setOpen(false)}
                                isPending={isPending}
                                disabled={!password}
                            />
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}

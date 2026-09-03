'use client'

import { useState, useTransition } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { UserX } from 'lucide-react'
import { deleteAccountAction } from '@/lib/actions/auth'
import { CARD_BASE } from '@/lib/dashboard/tokens'

// 계정(서비스) 탈퇴 — soft delete(익명화). 확인 다이얼로그 후 deleteAccountAction 호출.
export function DeleteAccountButton() {
    const [open, setOpen] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    const handleDelete = () => {
        setError(null)
        startTransition(async () => {
            // 성공 시 서버에서 redirect 되므로 실패(에러)일 때만 도달한다.
            const result = await deleteAccountAction()
            if (result?.error) {
                setError(result.error)
                return
            }
            setOpen(false)
        })
    }

    return (
        <div className={`${CARD_BASE} p-5 sm:p-6 border-destructive/30`}>
            <h2 className="text-h4 font-semibold text-destructive">회원 탈퇴</h2>
            <p className="text-caption text-muted-foreground mt-1">
                탈퇴 시 모든 클럽에서 나가지고 계정 정보가 삭제됩니다. 되돌릴 수 없습니다.
            </p>
            <Button
                variant="outline"
                size="sm"
                className="mt-3 gap-1.5 text-caption text-destructive border-destructive/40 hover:bg-destructive/10"
                onClick={() => {
                    setError(null)
                    setOpen(true)
                }}
            >
                <UserX className="w-3.5 h-3.5" />
                회원 탈퇴
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-destructive">회원 탈퇴</DialogTitle>
                        <DialogDescription>
                            정말 탈퇴하시겠습니까? 모든 클럽에서 탈퇴되고 계정 정보가 삭제됩니다.
                            과거 경기 기록은 &quot;탈퇴한 회원&quot;으로 남으며, 이 작업은 되돌릴 수 없습니다.
                        </DialogDescription>
                    </DialogHeader>

                    {error && <p className="text-caption text-destructive">{error}</p>}

                    <DialogFooter showCloseButton>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isPending}
                        >
                            {isPending ? '탈퇴 중...' : '탈퇴하기'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

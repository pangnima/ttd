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
import { LogOut } from 'lucide-react'
import { leaveClubAction } from '@/lib/actions/club-members'

type Props = {
    clubId: string
    clubName: string
}

export function LeaveClubButton({ clubId, clubName }: Props) {
    const [open, setOpen] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    const handleLeave = () => {
        setError(null)
        startTransition(async () => {
            const result = await leaveClubAction(clubId)
            // 성공 시 revalidate로 화면이 갱신되므로 실패(에러)일 때만 도달
            if (result?.error) {
                setError(result.error)
                return
            }
            setOpen(false)
        })
    }

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs text-destructive border-destructive/40 hover:bg-destructive/10"
                onClick={() => {
                    setError(null)
                    setOpen(true)
                }}
            >
                <LogOut className="w-3.5 h-3.5" />
                클럽 탈퇴
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-destructive">클럽 탈퇴</DialogTitle>
                        <DialogDescription>
                            &quot;{clubName}&quot; 클럽에서 탈퇴하시겠습니까? 다시 활동하려면 가입 신청 후 승인을 받아야 합니다.
                        </DialogDescription>
                    </DialogHeader>

                    {error && <p className="text-xs text-destructive">{error}</p>}

                    <DialogFooter showCloseButton>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleLeave}
                            disabled={isPending}
                        >
                            {isPending ? '탈퇴 중...' : '탈퇴하기'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

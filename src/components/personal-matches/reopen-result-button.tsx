'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MATCH_FORM_INPUT, MATCH_FORM_LABEL } from '@/lib/dashboard/tokens'
import { reopenMatchResultAction } from '@/lib/actions/match-results'
import { useResultDialog } from '@/components/personal-matches/use-result-dialog'

type Props = { requestId: string; description: string }

const REASON_MAX = 200

/**
 * 확정된 상호 확인 경기의 [결과 정정](0055) — 확정 후 오입력을 고칠 유일한 경로.
 * 되돌리면 양측(복식이면 참가자 전원) 기록이 미확정으로 돌아가 확인 요청 허브에 다시 뜨고,
 * 직전 확정값이 제안값으로 남아 재제안 시 프리필된다. 자격 판정은 호출부의 canReopenResult가 한다.
 */
export function ReopenResultButton({ requestId, description }: Props) {
    const d = useResultDialog()
    const [reason, setReason] = useState('')

    function submit(e: React.FormEvent) {
        e.preventDefault()
        d.run(() => reopenMatchResultAction(requestId, reason))
    }

    return (
        <>
            <button
                type="button"
                onClick={d.openDialog}
                className="text-caption text-muted-foreground hover:text-foreground transition-colors"
            >
                결과 정정
            </button>

            <Dialog open={d.open} onOpenChange={d.setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>확정된 결과를 정정할까요?</DialogTitle>
                        <DialogDescription>
                            {description} · 양쪽 기록이 미확정으로 돌아가고 확인 요청에서 다시 입력합니다.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <label htmlFor="reopen-reason" className={MATCH_FORM_LABEL}>정정 사유 (선택)</label>
                            <input
                                id="reopen-reason"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                maxLength={REASON_MAX}
                                placeholder="예: 3게임 스코어를 잘못 입력했습니다"
                                className={`${MATCH_FORM_INPUT} h-12 w-full`}
                            />
                        </div>
                        {d.error && <p className="text-caption text-destructive">{d.error}</p>}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => d.setOpen(false)} disabled={d.isPending}>
                                취소
                            </Button>
                            <Button type="submit" disabled={d.isPending}>
                                {d.isPending ? '처리 중…' : '정정 요청'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
}

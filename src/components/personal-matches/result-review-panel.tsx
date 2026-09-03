'use client'

import { useState } from 'react'
import type { PersonalMatchSetScore } from '@/types'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { SetScoreChips } from '@/components/personal-matches/set-score-chips'

const REASON_MAX = 200

type Props = {
    opponentName: string
    sets: PersonalMatchSetScore[]  // 상대가 제안한 세트 — 내 관점으로 반전 완료
    onConfirm: () => void
    onDispute: (reason: string) => void
    isPending: boolean
    error: string | null
}

/**
 * 결과 검토 패널 — 상대가 제안한 세트를 내 관점으로 보여주고 [확인] 또는 [이의 제기(사유 선택)]를 받는다.
 * 확인하면 양측 기록이 확정되어 이후 수정할 수 없다.
 */
export function ResultReviewPanel({ opponentName, sets, onConfirm, onDispute, isPending, error }: Props) {
    const [disputing, setDisputing] = useState(false)
    const [reason, setReason] = useState('')

    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 space-y-1.5">
                <p className="text-caption text-muted-foreground">
                    <span className="font-medium text-foreground">{opponentName}</span>님이 제안한 결과 (내 관점)
                </p>
                <SetScoreChips sets={sets} />
            </div>

            {disputing ? (
                <div className="space-y-1.5">
                    <label className="text-caption text-muted-foreground" htmlFor="dispute-reason">
                        이의 사유 (선택, {reason.length}/{REASON_MAX})
                    </label>
                    <Textarea
                        id="dispute-reason"
                        value={reason}
                        maxLength={REASON_MAX}
                        rows={3}
                        placeholder="예: 2세트는 6-3이었어요"
                        onChange={(e) => setReason(e.target.value)}
                    />
                </div>
            ) : (
                <p className="text-caption text-muted-foreground break-keep">
                    확인하면 양쪽 기록에 결과가 확정되며 이후 수정할 수 없습니다. 다르면 이의를 제기해 다시 입력받을 수 있습니다.
                </p>
            )}

            {error && <p className="text-caption text-destructive">{error}</p>}

            <DialogFooter showCloseButton>
                {disputing ? (
                    <>
                        <Button type="button" variant="ghost" disabled={isPending} onClick={() => setDisputing(false)}>
                            돌아가기
                        </Button>
                        <Button type="button" variant="destructive" disabled={isPending} onClick={() => onDispute(reason)}>
                            {isPending ? '처리 중...' : '이의 제기'}
                        </Button>
                    </>
                ) : (
                    <>
                        <Button type="button" variant="outline" disabled={isPending} onClick={() => setDisputing(true)}>
                            이의 제기
                        </Button>
                        <Button type="button" disabled={isPending} onClick={onConfirm}>
                            {isPending ? '확정 중...' : '결과 확인'}
                        </Button>
                    </>
                )}
            </DialogFooter>
        </div>
    )
}

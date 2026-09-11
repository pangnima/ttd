'use client'

import { useState } from 'react'
import type { PersonalMatchSetScore } from '@/types'
import { Button } from '@/components/ui/button'
import { FORM_ACTION_ROW, FORM_CANCEL, FORM_SUBMIT } from '@/lib/dashboard/tokens'
import { DialogFooter } from '@/components/ui/dialog'
import { FormActions } from '@/components/common/form-actions'
import { Textarea } from '@/components/ui/textarea'
import { SetScoreChips } from '@/components/personal-matches/set-score-chips'

const REASON_MAX = 200

type Props = {
    opponentName: string
    /** 제안자 표시 이름(0077) — 복식에서 파트너가 제안하면 상대팀 이름과 다르다 */
    proposerName?: string
    sets: PersonalMatchSetScore[]  // 제안된 게임(세트) 스코어 — 내 관점으로 반전 완료
    onConfirm: () => void
    onDispute: (reason: string) => void
    /** 팝업 닫기 — 하단 [취소] */
    onCancel: () => void
    progressLabel?: string  // '2/4명 확인' — 있으면 만장일치 진행도를 안내에 붙인다
    /** false면 이의 입력으로 바로 시작하고 [결과 확인]·[돌아가기]가 없다 — 이미 확인한 좌석 */
    confirmable?: boolean
    isPending: boolean
    error: string | null
}

/**
 * 결과 검토 패널 — 제안된 게임 스코어를 내 관점으로 보여주고 [확인] 또는 [이의 제기(사유 선택)]를 받는다.
 * 내 확인은 한 표다(0060) — 회원 좌석 전원이 확인한 순간 모두의 기록이 확정되어 이후 수정할 수 없다.
 */
export function ResultReviewPanel({
    opponentName, proposerName, sets, onConfirm, onDispute, onCancel, progressLabel, confirmable = true, isPending, error,
}: Props) {
    const [disputing, setDisputing] = useState(!confirmable)
    const [reason, setReason] = useState('')

    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 space-y-1.5">
                <p className="text-caption text-muted-foreground">
                    <span className="font-medium text-foreground">{proposerName ?? opponentName}</span>님이 제안한 결과 (내 관점)
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
                        placeholder="예: 2게임은 6-3이었어요"
                        onChange={(e) => setReason(e.target.value)}
                    />
                </div>
            ) : (
                <p className="text-caption text-muted-foreground break-keep">
                    회원 참가자 전원이 확인하면 모두의 기록에 결과가 확정되며 이후 수정할 수 없습니다.
                    {progressLabel && ` (지금까지 ${progressLabel})`} 다르면 이의를 제기해 다시 입력받을 수 있습니다.
                </p>
            )}

            {error && <p className="text-caption text-destructive">{error}</p>}

            {/* 주된 버튼만 라임이고 보조 액션(이의 제기·돌아가기)은 왼쪽 자리로 간다.
                이의 사유를 쓰는 중에는 [이의 제기]가 주된 버튼이지만 파괴적 행동이라 색은 destructive를 지킨다. */}
            <DialogFooter>
                {disputing ? (
                    <div className={FORM_ACTION_ROW}>
                        {confirmable && (
                            <Button
                                type="button"
                                variant="ghost"
                                className={`${FORM_CANCEL} lg:mr-auto`}
                                disabled={isPending}
                                onClick={() => setDisputing(false)}
                            >
                                돌아가기
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="destructive"
                            className={FORM_SUBMIT}
                            disabled={isPending}
                            onClick={() => onDispute(reason)}
                        >
                            {isPending ? '처리 중...' : '이의 제기'}
                        </Button>
                        <Button type="button" variant="outline" className={FORM_CANCEL} disabled={isPending} onClick={onCancel}>
                            취소
                        </Button>
                    </div>
                ) : (
                    <FormActions
                        submitLabel="결과 확인"
                        pendingLabel="확정 중..."
                        onSubmit={onConfirm}
                        onCancel={onCancel}
                        isPending={isPending}
                        secondary={(
                            <Button type="button" variant="outline" className={FORM_CANCEL} disabled={isPending} onClick={() => setDisputing(true)}>
                                이의 제기
                            </Button>
                        )}
                    />
                )}
            </DialogFooter>
        </div>
    )
}

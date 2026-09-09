'use client'

import { DialogFooter } from '@/components/ui/dialog'
import { FormActions } from '@/components/common/form-actions'

type FormFooterProps = {
    error: string | null
    isPending: boolean
    isValid: boolean
    // 저장 버튼 기본 문구 (신규: '경기 저장', 수정: '수정 완료', 방 게임: '게임 저장')
    submitLabel: string
    onCancel: () => void
    // 팝업 안에서는 하단 바(DialogFooter)에 얹는다 — 모든 저장형 팝업이 같은 자리를 쓴다
    variant?: 'page' | 'dialog'
}

/**
 * 폼 하단 — 에러 메시지 + 저장/취소. 버튼 자체는 FormActions 단일 출처다(색·치수·좌우 배치).
 * 페이지에서는 카드 바깥에 그대로 놓이고, 팝업에서는 DialogFooter 바 안에 들어간다.
 */
export function FormFooter({ error, isPending, isValid, submitLabel, onCancel, variant = 'page' }: FormFooterProps) {
    const actions = (
        <FormActions submitLabel={submitLabel} onCancel={onCancel} isPending={isPending} disabled={!isValid} />
    )

    return (
        <>
            {error && <p className="text-body2 text-destructive">{error}</p>}
            {variant === 'dialog' ? <DialogFooter>{actions}</DialogFooter> : actions}
        </>
    )
}

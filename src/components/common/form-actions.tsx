import type { ReactNode } from 'react'
import { FORM_ACTION_ROW, FORM_CANCEL, FORM_SUBMIT } from '@/lib/dashboard/tokens'
import { Button } from '@/components/ui/button'

type Props = {
    /** 상황별 문구만 다르다 — '게임 저장' · '정정 요청' · '매칭 만들기' … */
    submitLabel: string
    onCancel: () => void
    cancelLabel?: string
    /** 없으면 type="submit" — 폼 밖(팝업 패널)에서는 이 핸들러를 준다 */
    onSubmit?: () => void
    isPending?: boolean
    pendingLabel?: string
    disabled?: boolean
    /** 왼쪽에 붙는 보조 액션 — [다시 뽑기] · [이의 제기]처럼 저장/취소 축이 아닌 버튼 */
    secondary?: ReactNode
}

/**
 * 폼·팝업 하단의 액션 줄 — **저장(라임) 왼쪽 · 취소 오른쪽**, 전체는 우측 정렬.
 *
 * 팝업마다 색·크기·순서가 갈렸던 원인은 각자 Button 두 개를 조립한 것이었다. 조립을 여기 하나로 모아
 * 호출부는 라벨과 핸들러만 고르게 한다. 치수는 직접 기록 폼의 값이 정본이다(tokens의 FORM_* 3종).
 * 파괴적 확인(탈퇴·삭제)은 여기 오지 않는다 — 되돌릴 수 없는 행동은 색으로 위험을 말해야 한다.
 */
export function FormActions({
    submitLabel, onCancel, cancelLabel = '취소', onSubmit,
    isPending = false, pendingLabel = '저장 중...', disabled = false, secondary,
}: Props) {
    return (
        <div className={FORM_ACTION_ROW}>
            {secondary && <div className="lg:mr-auto">{secondary}</div>}
            <Button
                type={onSubmit ? 'button' : 'submit'}
                variant="accent"
                onClick={onSubmit}
                disabled={disabled || isPending}
                className={FORM_SUBMIT}
            >
                {isPending ? pendingLabel : submitLabel}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isPending} className={FORM_CANCEL}>
                {cancelLabel}
            </Button>
        </div>
    )
}

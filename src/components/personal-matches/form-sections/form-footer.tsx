'use client'

import { Button } from '@/components/ui/button'

type FormFooterProps = {
    error: string | null
    isPending: boolean
    isValid: boolean
    // 저장 버튼 기본 문구 (신규: '경기 저장', 수정: '수정 완료')
    submitLabel: string
    onCancel: () => void
}

/**
 * 폼 하단 — 에러 메시지 + 저장/취소 버튼. 카드 바깥에 렌더링된다.
 */
export function FormFooter({ error, isPending, isValid, submitLabel, onCancel }: FormFooterProps) {
    return (
        <>
            {error && <p className="text-body2 text-destructive">{error}</p>}

            <div className="flex gap-3 lg:justify-end">
                <Button
                    type="submit"
                    variant="accent"
                    disabled={isPending || !isValid}
                    className="h-11 flex-1 lg:flex-none lg:min-w-44"
                >
                    {isPending ? '저장 중...' : submitLabel}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    className="h-11 lg:min-w-24"
                >
                    취소
                </Button>
            </div>
        </>
    )
}

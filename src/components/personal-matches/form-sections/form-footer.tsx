'use client'

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
            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-3">
                <button
                    type="submit"
                    disabled={isPending || !isValid}
                    className="flex-1 py-2.5 text-sm font-medium bg-foreground text-background rounded-[4px] hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {isPending ? '저장 중...' : submitLabel}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2.5 text-sm text-muted-foreground border border-border rounded-[4px] hover:border-input transition-colors"
                >
                    취소
                </button>
            </div>
        </>
    )
}

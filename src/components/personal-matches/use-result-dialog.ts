'use client'

import { useState, useTransition } from 'react'

type ActionResult = { error: string | null }

/**
 * 결과 등록 Dialog 공통 state — open/error/isPending + 서버 액션 실행 래퍼.
 * 성공 시 Dialog를 닫고(목록은 revalidatePath로 갱신), 실패 시 에러를 Dialog 안에 표시한다.
 */
export function useResultDialog() {
    const [open, setOpen] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    function openDialog() {
        setError(null)
        setOpen(true)
    }

    function run(action: () => Promise<ActionResult>) {
        setError(null)
        startTransition(async () => {
            const result = await action()
            if (result.error) {
                setError(result.error)
                return
            }
            setOpen(false)
        })
    }

    return { open, setOpen, openDialog, error, isPending, run }
}

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type ActionResult = { error: string | null; stale?: boolean }

/**
 * 결과 등록 Dialog 공통 state — open/error/isPending + 서버 액션 실행 래퍼.
 * 성공 시 Dialog를 닫고(목록은 revalidatePath로 갱신), 실패 시 에러를 Dialog 안에 표시한다.
 *
 * `stale`(내 화면이 낡아서 거부됨 — 그 사이 다른 참가자가 먼저 제안·확인·이의·게임 등록)이면 Dialog를 **열어 둔 채**
 * router.refresh()한다. open은 카드가 소유하므로 새 데이터로 카드 분기가 바뀌면(예: 결과 입력 → 결과 확인)
 * 같은 팝업이 검토 모드로 바뀌고, 로테이션 빌더는 '등록된 게임' 목록이 늘어난다. 에러 문구는 남겨 두어
 * 사용자가 왜 자기 입력이 거부됐는지 읽을 수 있다 — 닫아 버리면 입력이 사라진 이유를 알 수 없다.
 */
export function useResultDialog() {
    const router = useRouter()
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
                if (result.stale) router.refresh()
                return
            }
            setOpen(false)
        })
    }

    return { open, setOpen, openDialog, error, isPending, run }
}

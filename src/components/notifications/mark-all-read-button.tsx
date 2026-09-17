'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { HEADER_ACTION_LINK } from '@/lib/dashboard/tokens'
import { markNotificationsReadAction } from '@/lib/actions/notifications'
import { cn } from '@/lib/utils'

/** 전체 목록 헤더의 [모두 읽음] — 안 읽은 것이 없으면 비활성 */
export function MarkAllReadButton({ unreadCount }: { unreadCount: number }) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    return (
        <button
            type="button"
            className={cn(HEADER_ACTION_LINK, 'disabled:opacity-50 disabled:cursor-not-allowed')}
            disabled={unreadCount === 0 || isPending}
            onClick={() =>
                startTransition(async () => {
                    await markNotificationsReadAction()
                    router.refresh()
                })
            }
        >
            {isPending ? '처리 중…' : '모두 읽음'}
        </button>
    )
}

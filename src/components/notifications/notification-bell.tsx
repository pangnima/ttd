'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import type { Notification } from '@/types'
import { DropdownMenu, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { NotificationMenu } from '@/components/notifications/notification-menu'
import type { NotificationInbox } from '@/lib/queries/notifications'
import { markNotificationsReadAction } from '@/lib/actions/notifications'
import { notificationHref } from '@/lib/notifications/labels'
import { cn } from '@/lib/utils'

type Props = { inbox: NotificationInbox }

/**
 * 헤더 종 아이콘(Week 71) — "일어난 일"의 창구. 사이드바 뱃지("내가 할 일")와 섞지 않는다.
 * 읽음은 낙관적으로 먼저 그리고 서버 액션 뒤 `router.refresh()`로 레이아웃 props를 다시 받는다 — 새 props가
 * 오면 로컬 상태를 비운다(서버가 정본).
 */
export function NotificationBell({ inbox }: Props) {
    const router = useRouter()
    const [, startTransition] = useTransition()
    const [readIds, setReadIds] = useState<ReadonlySet<string>>(() => new Set())
    const [allRead, setAllRead] = useState(false)
    // 새 props(서버 정본)가 오면 낙관적 상태를 렌더 중에 비운다 — effect로 하면 한 프레임 낡은 값이 보인다
    const [seenInbox, setSeenInbox] = useState(inbox)
    if (seenInbox !== inbox) {
        setSeenInbox(inbox)
        setReadIds(new Set())
        setAllRead(false)
    }

    const locallyRead = inbox.recent.filter((n) => n.readAt === null && readIds.has(n.id)).length
    const unreadCount = allRead ? 0 : Math.max(0, inbox.unreadCount - locallyRead)

    const open = (n: Notification) => {
        if (n.readAt === null && !readIds.has(n.id)) {
            setReadIds((prev) => new Set(prev).add(n.id))
            startTransition(async () => {
                await markNotificationsReadAction([n.id])
            })
        }
        router.push(notificationHref(n))
    }

    const readAll = () => {
        setAllRead(true)
        startTransition(async () => {
            await markNotificationsReadAction()
            router.refresh()
        })
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                aria-label={unreadCount > 0 ? `알림 ${unreadCount}건` : '알림'}
                className="relative inline-flex p-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span
                        className={cn(
                            'absolute -top-0.5 -right-0.5 min-w-[1.125rem] h-[1.125rem] px-1 rounded-full',
                            'bg-spot-solid text-spot-foreground text-micro font-semibold leading-[1.125rem] text-center tabular-nums',
                        )}
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </DropdownMenuTrigger>
            <NotificationMenu recent={inbox.recent} readIds={readIds} unreadCount={unreadCount} onOpen={open} onReadAll={readAll} />
        </DropdownMenu>
    )
}

'use client'

import Link from 'next/link'
import type { Notification } from '@/types'
import { NotificationRow } from '@/components/notifications/notification-row'
import { markNotificationsReadAction } from '@/lib/actions/notifications'
import { notificationHref } from '@/lib/notifications/labels'

/** 전체 목록의 한 항목 — 누르면 읽음 처리 뒤 이동(읽음은 기다리지 않는다, 목적지 화면이 먼저다) */
export function NotificationLink({ notification }: { notification: Notification }) {
    return (
        <Link
            href={notificationHref(notification)}
            className="block px-4 py-3 hover:bg-muted/60 transition-colors"
            onClick={() => {
                if (notification.readAt === null) void markNotificationsReadAction([notification.id])
            }}
        >
            <NotificationRow notification={notification} />
        </Link>
    )
}

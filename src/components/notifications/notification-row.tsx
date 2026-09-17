import type { Notification } from '@/types'
import { formatRelativeTime } from '@/lib/format'
import { notificationLabel, notificationTitleLine } from '@/lib/notifications/labels'
import { cn } from '@/lib/utils'

type Props = {
    notification: Notification
    /** 드롭다운용 — 본문을 한 줄로 자른다 */
    compact?: boolean
    /** 낙관적 읽음 — 서버 값(readAt)보다 앞서 화면이 먼저 읽음으로 그린다 */
    read?: boolean
}

/**
 * 알림 한 줄 — 헤더 드롭다운과 `/me/notifications`가 같은 것을 그린다(Week 71).
 * 문구는 labels.ts, 안 읽음은 왼쪽 점(primary — 텍스트 링크·활성과 같은 뜻의 색).
 */
export function NotificationRow({ notification, compact = false, read }: Props) {
    const unread = read === undefined ? notification.readAt === null : !read
    const label = notificationLabel(notification)
    const roomLine = notificationTitleLine(notification.payload)

    return (
        <div className="flex items-start gap-2.5 min-w-0">
            <span
                aria-hidden
                className={cn('mt-2 h-1.5 w-1.5 shrink-0 rounded-full', unread ? 'bg-primary' : 'bg-transparent')}
            />
            <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-baseline justify-between gap-2">
                    <p className={cn('text-body2 truncate', unread ? 'font-semibold text-foreground' : 'font-medium text-foreground/80')}>
                        {label.title}
                    </p>
                    <time className="text-caption text-muted-foreground shrink-0" dateTime={notification.createdAt}>
                        {formatRelativeTime(notification.createdAt)}
                    </time>
                </div>
                <p className={cn('text-caption text-muted-foreground break-keep', compact && 'line-clamp-2')}>{label.body}</p>
                {roomLine && <p className="text-caption text-muted-foreground/80 truncate">{roomLine}</p>}
            </div>
        </div>
    )
}

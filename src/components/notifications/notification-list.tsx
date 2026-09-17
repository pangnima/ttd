import type { Notification } from '@/types'
import { EmptyState } from '@/components/common/empty-state'
import { NotificationLink } from '@/components/notifications/notification-link'
import { LIST_CARD } from '@/lib/dashboard/tokens'

/** `/me/notifications` 목록 — 최근 50건, 읽음/안 읽음은 행의 점으로 */
export function NotificationList({ notifications }: { notifications: Notification[] }) {
    if (notifications.length === 0) {
        return <EmptyState size="md" title="아직 알림이 없습니다" description="매칭 초대·결과 입력·확정 같은 일이 생기면 여기에 쌓입니다." />
    }
    return (
        <div className={LIST_CARD}>
            {notifications.map((n) => (
                <NotificationLink key={n.id} notification={n} />
            ))}
        </div>
    )
}

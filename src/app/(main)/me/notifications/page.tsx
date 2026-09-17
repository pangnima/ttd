import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchNotificationList, LIST_LIMIT } from '@/lib/queries/notifications'
import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'
import { NotificationList } from '@/components/notifications/notification-list'
import { MarkAllReadButton } from '@/components/notifications/mark-all-read-button'

export const metadata = { title: '알림' }

/**
 * 알림 전체 목록(Week 71) — 헤더 종 아이콘의 [전체 보기] 착지. 최근 50건.
 * 사이드바 메뉴에는 두지 않는다 — 진입점은 종 하나면 충분하고, "할 일"은 여전히 「참여 중인 매칭」이 맡는다.
 */
export default async function NotificationsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login?next=/me/notifications')

    const notifications = await fetchNotificationList(user.id)
    const unreadCount = notifications.filter((n) => n.readAt === null).length

    return (
        <PageContainer>
            <PageHeader
                title="알림"
                description={`최근 ${LIST_LIMIT}건까지 보입니다. 읽은 알림은 30일 뒤 정리됩니다`}
                actions={<MarkAllReadButton unreadCount={unreadCount} />}
            />
            <NotificationList notifications={notifications} />
        </PageContainer>
    )
}

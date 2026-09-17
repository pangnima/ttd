import 'server-only'

import { cache } from 'react'
import type { Notification, NotificationPayload, NotificationType } from '@/types'
import type { Database } from '@/types/supabase'
import { createClient } from '@/lib/supabase/server'

type Row = Database['public']['Tables']['notifications']['Row']

/** 헤더 종 아이콘이 받는 한 벌 — 안 읽은 수 + 최근 N건 */
export type NotificationInbox = { unreadCount: number; recent: Notification[] }

export const INBOX_RECENT_LIMIT = 10
export const LIST_LIMIT = 50

export function mapNotificationRow(row: Row): Notification {
    return {
        id: row.id,
        type: row.type as NotificationType,
        roomId: row.room_id,
        requestId: row.request_id,
        actorUserId: row.actor_user_id,
        // DB CHECK가 object임을 보장한다(0094) — 키는 room_snapshot·트리거가 넣은 것뿐
        payload: (row.payload ?? {}) as NotificationPayload,
        createdAt: row.created_at,
        readAt: row.read_at,
    }
}

/**
 * 헤더용 받은 편지함(Week 71). `(main)` 레이아웃이 페이지마다 한 번 부른다 — React cache라 같은 요청 안에서는 한 벌.
 * RLS(`notifications_select`)가 본인 행으로 좁히므로 user_id 조건은 방어적 중복이다.
 */
export const fetchNotificationInbox = cache(async (userId: string): Promise<NotificationInbox> => {
    const supabase = await createClient()
    const [countRes, recentRes] = await Promise.all([
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('read_at', null),
        supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(INBOX_RECENT_LIMIT),
    ])
    return {
        unreadCount: countRes.count ?? 0,
        recent: (recentRes.data ?? []).map(mapNotificationRow),
    }
})

/** `/me/notifications` 전체 목록 — 최근 50건 */
export const fetchNotificationList = cache(async (userId: string): Promise<Notification[]> => {
    const supabase = await createClient()
    const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(LIST_LIMIT)
    return (data ?? []).map(mapNotificationRow)
})

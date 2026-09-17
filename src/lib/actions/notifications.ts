'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/**
 * 알림 읽음 처리(Week 71). 쓰기는 RPC `mark_notifications_read`(0094)뿐 — 정책으로 UPDATE를 열지 않았다.
 * ids를 비우면 전부. 헤더 카운트는 호출한 클라이언트가 낙관적으로 줄이고 `router.refresh()`로 레이아웃을 다시 받는다 —
 * `revalidatePath('/', 'layout')`은 전역 무효화라 쓰지 않는다.
 */
export async function markNotificationsReadAction(ids?: string[]): Promise<{ error: string | null }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const { error } = await supabase.rpc('mark_notifications_read', ids && ids.length > 0 ? { p_ids: ids } : {})
    if (error) return { error: '읽음 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.' }

    revalidatePath('/me/notifications')
    return { error: null }
}

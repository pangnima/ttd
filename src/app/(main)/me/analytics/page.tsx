import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * /me/analytics는 /profile/[userId]로 통합되었습니다.
 * 이 페이지는 기존 URL 접근자를 위한 리다이렉트만 처리합니다.
 */
export default async function AnalyticsRedirectPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    redirect(`/profile/${user.id}?scope=total`)
}

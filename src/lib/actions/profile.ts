'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfileAction(
    _prevState: { error: string } | null,
    formData: FormData
): Promise<{ error: string } | null> {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다' }

    let profileImage: string | undefined

    const avatar = formData.get('avatar') as File | null
    if (avatar && avatar.size > 0) {
        const ext = avatar.name.split('.').pop()
        const path = `${user.id}/avatar.${ext}`
        await supabase.storage.from('avatars').upload(path, avatar, { upsert: true })
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
        profileImage = urlData.publicUrl
    }

    const updates = {
        name: formData.get('name') as string,
        nickname: formData.get('nickname') as string,
        phone: (formData.get('phone') as string) || null,
        gender: (formData.get('gender') as string) || null,
        dominant_hand: (formData.get('dominant_hand') as string) || null,
        tennis_start_date: (formData.get('tennis_start_date') as string) || null,
        ntrp: formData.get('ntrp') ? Number(formData.get('ntrp')) : null,
        stats_hidden: formData.get('stats_hidden') === 'true',
        ...(profileImage ? { profile_image: profileImage } : {}),
    }

    const { error } = await supabase.from('users').update(updates).eq('id', user.id)
    if (error) return { error: error.message }

    revalidatePath('/profile/settings')
    revalidatePath('/me/analytics')
    return null
}

export async function toggleStatsHiddenAction(hidden: boolean): Promise<void> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('users').update({ stats_hidden: hidden }).eq('id', user.id)
    revalidatePath('/me/analytics')
    revalidatePath('/profile/settings')
    // 내 분석 화면(/profile/[userId])의 블러 모드 즉시 반영
    revalidatePath('/profile', 'layout')
}

export async function updatePasswordAction(
    _prevState: { error: string; success?: boolean } | null,
    formData: FormData
): Promise<{ error: string; success?: boolean } | null> {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다' }

    const currentPassword = formData.get('current_password') as string
    const newPassword = formData.get('new_password') as string
    const confirmPassword = formData.get('confirm_password') as string

    if (newPassword.length < 6) return { error: '새 비밀번호는 6자 이상이어야 합니다' }
    if (newPassword !== confirmPassword) return { error: '새 비밀번호가 일치하지 않습니다' }

    const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
    })
    if (signInError) return { error: '현재 비밀번호가 올바르지 않습니다' }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { error: error.message }

    return { error: '', success: true }
}

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
        ...(profileImage ? { profile_image: profileImage } : {}),
    }

    const { error } = await supabase.from('users').update(updates).eq('id', user.id)
    if (error) return { error: error.message }

    revalidatePath('/profile/settings')
    return null
}

'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function loginAction(
    _prevState: { error: string } | null,
    formData: FormData
): Promise<{ error: string } | null> {
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    })
    if (error) return { error: error.message }
    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

export async function signupAction(
    _prevState: { error: string } | null,
    formData: FormData
): Promise<{ error: string } | null> {
    const supabase = await createClient()
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                name: formData.get('name'),
                nickname: formData.get('nickname'),
                phone: formData.get('phone'),
                gender: formData.get('gender'),
                dominant_hand: formData.get('dominant_hand'),
                tennis_start_date: formData.get('tennis_start_date'),
            },
        },
    })
    if (error) return { error: error.message }

    // 프로필 사진 업로드 (선택)
    const avatar = formData.get('avatar') as File | null
    if (avatar && avatar.size > 0 && data.user) {
        const ext = avatar.name.split('.').pop()
        const path = `${data.user.id}/avatar.${ext}`
        const { error: upErr } = await supabase.storage
            .from('avatars')
            .upload(path, avatar, { upsert: true })
        if (!upErr) {
            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(path)
            await supabase
                .from('users')
                .update({ profile_image: urlData.publicUrl })
                .eq('id', data.user.id)
        }
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

export async function logoutAction() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
}

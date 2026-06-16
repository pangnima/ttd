'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { randomAvatarPath } from '@/lib/default-images'

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
    redirect('/clubs')
}

export async function signupAction(
    _prevState: { error: string } | null,
    formData: FormData
): Promise<{ error: string } | null> {
    const supabase = await createClient()
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const passwordConfirm = formData.get('password_confirm') as string | null

    // 비밀번호 확인 일치 검증 (클라이언트 검증의 서버 측 방어선)
    if (passwordConfirm !== null && password !== passwordConfirm) {
        return { error: '비밀번호가 일치하지 않습니다.' }
    }

    // options.data는 Supabase Auth metadata로 전달되며,
    // handle_new_user DB 트리거가 이 값을 읽어 public.users row를 자동 생성함.
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
                ntrp: formData.get('ntrp'),
            },
        },
    })
    if (error) return { error: error.message }

    // 프로필 사진 (선택) — 업로드가 없으면 폼에서 선택한 기본 아바타(없으면 랜덤)를 배정
    const avatar = formData.get('avatar') as File | null
    const defaultAvatar = formData.get('default_avatar') as string | null
    if (data.user) {
        let profileImage = defaultAvatar || randomAvatarPath()
        if (avatar && avatar.size > 0) {
            const ext = avatar.name.split('.').pop()
            const path = `${data.user.id}/avatar.${ext}`
            const { error: upErr } = await supabase.storage
                .from('avatars')
                .upload(path, avatar, { upsert: true })
            if (!upErr) {
                const { data: urlData } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(path)
                profileImage = urlData.publicUrl
            }
            // 업로드 실패 시 randomAvatarPath() 폴백 유지
        }
        await supabase
            .from('users')
            .update({ profile_image: profileImage })
            .eq('id', data.user.id)
    }

    revalidatePath('/', 'layout')
    redirect('/clubs')
}

export async function logoutAction() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
}

'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { randomAvatarPath } from '@/lib/default-images'
import { mapAuthError } from '@/lib/auth/auth-error-messages'

export async function loginAction(
    _prevState: { error: string } | null,
    formData: FormData
): Promise<{ error: string } | null> {
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    })
    if (error) return { error: mapAuthError(error.message) }
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
    if (error) return { error: mapAuthError(error.message) }

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

// 비밀번호 재설정 메일 요청.
// 이메일 존재 여부를 노출하지 않기 위해 성공/실패와 무관하게 동일한 안내 결과를 반환한다.
export async function requestPasswordResetAction(
    _prevState: { error?: string; success?: boolean } | null,
    formData: FormData
): Promise<{ error?: string; success?: boolean }> {
    const email = (formData.get('email') as string)?.trim()
    if (!email) return { error: '이메일을 입력해 주세요.' }

    // redirectTo 베이스 URL: 환경변수 우선, 없으면 요청 origin 헤더 사용
    const headerStore = await headers()
    const origin =
        process.env.NEXT_PUBLIC_SITE_URL ||
        headerStore.get('origin') ||
        `https://${headerStore.get('host')}`

    const supabase = await createClient()
    await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/confirm?next=/reset-password`,
    })

    // 메일 발송 결과를 그대로 노출하지 않고 항상 동일 안내 (이메일 존재 여부 보호)
    return { success: true }
}

// 재설정 링크를 통해 임시 세션이 설정된 상태에서 새 비밀번호를 저장한다.
// 저장 후 보안을 위해 로그아웃 → /login 으로 이동.
export async function resetPasswordAction(
    _prevState: { error: string } | null,
    formData: FormData
): Promise<{ error: string } | null> {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: '재설정 세션이 만료되었습니다. 다시 시도해 주세요.' }

    const newPassword = formData.get('new_password') as string
    const confirmPassword = formData.get('confirm_password') as string

    if (newPassword.length < 6) return { error: '새 비밀번호는 6자 이상이어야 합니다' }
    if (newPassword !== confirmPassword) return { error: '새 비밀번호가 일치하지 않습니다' }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { error: mapAuthError(error.message) }

    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
}

'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ProfileActionState = { error?: string; success?: boolean }

export async function updateProfileAction(
    _prevState: ProfileActionState | null,
    formData: FormData
): Promise<ProfileActionState | null> {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다' }

    let profileImage: string | undefined

    const avatar = formData.get('avatar') as File | null
    const defaultAvatar = (formData.get('default_avatar') as string) || null
    if (avatar && avatar.size > 0) {
        // 파일 업로드가 있으면 Storage에 저장 (업로드 우선)
        const ext = avatar.name.split('.').pop()
        const path = `${user.id}/avatar.${ext}`
        await supabase.storage.from('avatars').upload(path, avatar, { upsert: true })
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
        profileImage = urlData.publicUrl
    } else if (defaultAvatar) {
        // 업로드 없이 "기본 이미지로 변경"을 선택한 경우, 미리보기로 보여준 기본 아바타 경로를 그대로 저장
        profileImage = defaultAvatar
    }

    // 이름·성별·주력손·테니스 시작일·NTRP·주력 라켓은 가입 시 1회 입력, 변경 불가 정책 —
    // update 대상에서 제외해 서버에서 무시한다. (ntrp를 여기 남기면 폼에 필드가 없어 매 저장마다 NULL로 덮이므로 주의)
    const updates = {
        nickname: formData.get('nickname') as string,
        phone: (formData.get('phone') as string) || null,
        stats_hidden: formData.get('stats_hidden') === 'true',
        ...(profileImage ? { profile_image: profileImage } : {}),
    }

    const { error } = await supabase.from('users').update(updates).eq('id', user.id)
    if (error) return { error: error.message }

    revalidatePath('/profile/settings')
    revalidatePath('/me/analytics')
    // 헤더(이름·아바타)가 포함된 (main) 레이아웃 무효화 → 저장 후 즉시 반영
    revalidatePath('/', 'layout')
    return { success: true }
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

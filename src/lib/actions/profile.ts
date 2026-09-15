'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { resolveRacketBrand, normalizeRacketModel } from '@/lib/profile/signup-fields'
import { parseYearMonth, toStartDateString } from '@/lib/format/year-month'
import { checkIdentityFields, isLoginIdConflict, isNicknameConflict } from '@/lib/profile/identity-fields'
import { NICKNAME_TAKEN_MESSAGE } from '@/lib/profile/nickname'
import { hasPasswordIdentity } from '@/lib/auth/account-providers'
import { validatePassword } from '@/lib/auth/password-policy'
import { LOGIN_ID_TAKEN_MESSAGE, normalizeLoginId, validateLoginId } from '@/lib/auth/login-id'
import { mapAuthError } from '@/lib/auth/auth-error-messages'

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

    // 가입 폼과 같은 검증을 본다 — 여기에 없으면 가입 후 프로필에서 남의 닉네임으로 바꾸는 우회로가 남는다.
    const identity = checkIdentityFields({
        nickname: formData.get('nickname'),
        phone: formData.get('phone'),
    })
    if (!identity.ok) return { error: identity.error }

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

    // 테니스 시작일만 예외 — **비어 있을 때 1회** 받는다(Week 56).
    // 필수로 올리기 전에 가입한 회원은 null로 남아 있는데, 설정은 읽기 전용이고 완성 화면은
    // 재진입이 막혀 어느 화면에서도 채울 수 없었다. `completeProfileAction`의 `ntrp != null`
    // 가드와 같은 모양이고, 정책이 「변경 불가」에서 「입력 후 변경 불가」로 좁혀질 뿐이다.
    // 문구는 signupAction·completeProfileAction과 한 글자도 다르지 않아야 한다.
    const startRaw = ((formData.get('tennis_start_date') as string | null) ?? '').trim()
    let tennisStartDate: string | null = null
    if (startRaw) {
        const parsed = parseYearMonth(startRaw)
        if (!parsed) return { error: '테니스 시작일은 2022/07 형식(년/월)으로 입력해 주세요.' }
        const { data: current } = await supabase
            .from('users')
            .select('tennis_start_date')
            .eq('id', user.id)
            .single()
        if (current?.tennis_start_date != null) {
            return { error: '테니스 시작일은 이미 입력되어 변경할 수 없습니다.' }
        }
        tennisStartDate = toStartDateString(parsed)
    }

    // 아이디(0085)도 같은 관용구 — **비어 있을 때 1회**. 0085 이전 회원과 소셜 가입자는 null이라
    // 이메일로만 로그인하는데, 프로필에서 한 번 정할 수 있어야 한다. 값이 있으면 폼에 필드가 없고
    // 서버도 받지 않는다(이름과 같은 "입력 후 변경 불가"). 비밀번호 없는 계정은 화면이 열지 않지만
    // 서버는 그 조건을 따로 보지 않는다 — 아이디가 있어도 로그인할 방법이 없을 뿐 해롭지 않다.
    const loginIdRaw = normalizeLoginId(formData.get('login_id') as string | null)
    let loginId: string | null = null
    if (loginIdRaw) {
        const invalid = validateLoginId(loginIdRaw)
        if (invalid) return { error: invalid }
        const { data: current } = await supabase.from('users').select('login_id').eq('id', user.id).single()
        if (current?.login_id != null) return { error: '아이디는 이미 설정되어 변경할 수 없습니다.' }
        const { data: taken } = await supabase.rpc('is_login_id_taken', { p_login_id: loginIdRaw })
        if (taken) return { error: LOGIN_ID_TAKEN_MESSAGE }
        loginId = loginIdRaw
    }

    // 이름·성별·주력손·NTRP는 가입 시 1회 입력, 변경 불가 정책 —
    // update 대상에서 제외해 서버에서 무시한다. (ntrp를 여기 남기면 폼에 필드가 없어 매 저장마다 NULL로 덮이므로 주의)
    // 시작일도 **값이 있을 때만** 조건부로 넣는다 — 같은 이유로 무조건 넣으면 매 저장마다 NULL이 된다.
    const updates = {
        nickname: identity.values.nickname,
        phone: identity.values.phone || null,
        racket_brand: resolveRacketBrand(
            formData.get('racket_choice') as string | null,
            formData.get('racket_other') as string | null
        ),
        racket_model: normalizeRacketModel(formData.get('racket_model') as string | null),
        stats_hidden: formData.get('stats_hidden') === 'true',
        ...(profileImage ? { profile_image: profileImage } : {}),
        ...(tennisStartDate ? { tennis_start_date: tennisStartDate } : {}),
        ...(loginId ? { login_id: loginId } : {}),
    }

    const { error } = await supabase.from('users').update(updates).eq('id', user.id)
    // 화면 검사를 통과한 뒤 남이 같은 닉네임을 먼저 저장한 경우 — 인덱스가 잡는다(0079).
    if (isNicknameConflict(error)) return { error: NICKNAME_TAKEN_MESSAGE }
    if (isLoginIdConflict(error)) return { error: LOGIN_ID_TAKEN_MESSAGE }
    if (error) return { error: error.message }

    revalidatePath('/profile/settings')
    revalidatePath(`/profile/${user.id}`)
    // 헤더(이름·아바타)가 포함된 (main) 레이아웃 무효화 → 저장 후 즉시 반영
    revalidatePath('/', 'layout')
    return { success: true }
}

export async function toggleStatsHiddenAction(hidden: boolean): Promise<void> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('users').update({ stats_hidden: hidden }).eq('id', user.id)
    revalidatePath(`/profile/${user.id}`)
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

    // 노출 조건과 짝을 맞춘 가드 — 화면에서 폼을 뺐으면 액션도 거절해야 한다(0072).
    // 덤으로 비밀번호 없는 계정에 대한 무의미한 signInWithPassword 시도가 사라진다(시도 제한 소모도).
    if (!hasPasswordIdentity({ identities: user.identities, providers: user.app_metadata?.providers })) {
        return { error: '소셜 계정으로 로그인 중이라 비밀번호를 변경할 수 없습니다.' }
    }

    const currentPassword = formData.get('current_password') as string
    const newPassword = formData.get('new_password') as string
    const confirmPassword = formData.get('confirm_password') as string

    const weak = validatePassword(newPassword)
    if (weak) return { error: weak }
    if (newPassword !== confirmPassword) return { error: '새 비밀번호가 일치하지 않습니다' }

    const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
    })
    if (signInError) return { error: '현재 비밀번호가 올바르지 않습니다' }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { error: mapAuthError(error.message) }

    return { error: '', success: true }
}

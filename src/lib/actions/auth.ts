'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { randomAvatarPath } from '@/lib/default-images'
import { DELETED_ACCOUNT_MESSAGE, mapAuthError, OAUTH_ERROR_PARAM } from '@/lib/auth/auth-error-messages'
import { isSafeNext } from '@/lib/supabase/middleware'
import { parseYearMonth, toStartDateString } from '@/lib/format/year-month'
import { isGenderValue, isHandValue, isSignupNtrp, resolveRacketBrand, normalizeRacketModel } from '@/lib/profile/signup-fields'
import { checkIdentityFields } from '@/lib/profile/identity-fields'
import { NICKNAME_TAKEN_MESSAGE } from '@/lib/profile/nickname'
import { EMAIL_TAKEN_MESSAGE, normalizeEmail } from '@/lib/auth/email'

export async function loginAction(
    _prevState: { error: string } | null,
    formData: FormData
): Promise<{ error: string } | null> {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    })
    if (error) return { error: mapAuthError(error.message) }

    // 탈퇴(익명화)된 계정은 로그인 차단 — 세션을 즉시 종료한다.
    if (data.user) {
        const { data: profile } = await supabase
            .from('users')
            .select('deleted_at')
            .eq('id', data.user.id)
            .single()
        if (profile?.deleted_at) {
            await supabase.auth.signOut()
            return { error: DELETED_ACCOUNT_MESSAGE }
        }
    }

    // 로그인 전 가려던 내부 경로가 있으면 그곳으로 복귀 (초대 링크 등). 오픈 리다이렉트 방지.
    // 그 외에는 내 전적 > 개인 탭을 기본 진입점으로 한다.
    const next = formData.get('next') as string | null
    const fallback = data.user ? `/profile/${data.user.id}?scope=personal` : '/clubs'
    const dest = isSafeNext(next) ? next : fallback

    revalidatePath('/', 'layout')
    redirect(dest)
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

    // 개인정보 수집·이용 동의 — 폼의 required는 브라우저가 지키는 것이라 서버에서 한 번 더 본다.
    if (formData.get('agree_privacy') !== 'true') {
        return { error: '개인정보 수집·이용에 동의해 주세요.' }
    }

    // 테니스 정보 검증 — handle_new_user 트리거는 auth.users INSERT와 같은 트랜잭션이라
    // 캐스팅/CHECK 실패 시 가입 전체가 불투명한 에러로 롤백된다. 반드시 signUp 호출 전에 걸러낸다.
    const gender = formData.get('gender')
    const dominantHand = formData.get('dominant_hand')
    const ntrp = formData.get('ntrp')
    if (!isGenderValue(gender) || !isHandValue(dominantHand)) {
        return { error: '성별과 주력손을 선택해 주세요.' }
    }
    if (!isSignupNtrp(ntrp)) {
        return { error: 'NTRP를 1.0~4.0 사이에서 선택해 주세요.' }
    }
    const startRaw = ((formData.get('tennis_start_date') as string | null) ?? '').trim()
    let tennisStartDate = ''
    if (startRaw) {
        const parsed = parseYearMonth(startRaw)
        if (!parsed) return { error: '테니스 시작일은 2022/07 형식(년/월)으로 입력해 주세요.' }
        tennisStartDate = toStartDateString(parsed)
    }
    const racketBrand = resolveRacketBrand(
        formData.get('racket_choice') as string | null,
        formData.get('racket_other') as string | null
    )

    // 이름·닉네임·휴대폰 — 같은 이유로 signUp 전에 본다. 0079가 셋 모두에 DB 제약을 걸었으므로
    // 여기서 놓치면 트리거가 CHECK에 걸려 가입이 통째로 롤백된다(사용자에겐 불투명한 에러만 보인다).
    const identity = checkIdentityFields({
        name: formData.get('name'),
        nickname: formData.get('nickname'),
        phone: formData.get('phone'),
    })
    if (!identity.ok) return { error: identity.error }

    // 닉네임 유일성의 권위는 users_nickname_unique_idx(0079)지만, 인덱스에서 걸리면 트리거 롤백이라
    // 메시지가 불투명하다. 그래서 여기서 한 번 더 묻는다 — 화면 검사와 같은 RPC(0080)를 본다.
    const { data: nicknameTaken } = await supabase.rpc('is_nickname_taken', {
        p_nickname: identity.values.nickname,
    })
    if (nicknameTaken) return { error: NICKNAME_TAKEN_MESSAGE }

    // 이메일도 같은 방식으로 먼저 본다(0081). 지금은 signUp이 'User already registered'를 주지만,
    // **이메일 확인을 켜는 순간 Supabase가 열거 방지로 성공을 가장해** 그 메시지가 사라진다.
    // 화면 검사와 같은 RPC를 여기서도 보면 그 전환에 흔들리지 않는다.
    const { data: emailTaken } = await supabase.rpc('is_email_taken', {
        p_email: normalizeEmail(email),
    })
    if (emailTaken) return { error: EMAIL_TAKEN_MESSAGE }

    // options.data는 Supabase Auth metadata로 전달되며,
    // handle_new_user DB 트리거가 이 값을 읽어 public.users row를 자동 생성함.
    const { data, error } = await supabase.auth.signUp({
        email: normalizeEmail(email),
        password,
        options: {
            data: {
                name: identity.values.name,
                nickname: identity.values.nickname,
                phone: identity.values.phone,
                gender,
                dominant_hand: dominantHand,
                tennis_start_date: tennisStartDate,
                ntrp,
                racket_brand: racketBrand ?? '',
                racket_model: normalizeRacketModel(formData.get('racket_model') as string | null) ?? '',
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

// 계정(서비스) 탈퇴 — soft delete(익명화).
// 물리 삭제는 과거 경기(player FK SET NULL)·레이팅(CASCADE)을 손상시키므로,
// users 행을 보존하고 개인정보만 익명화한 뒤 deleted_at에 탈퇴 시각을 기록한다.
export async function deleteAccountAction(): Promise<{ error: string } | null> {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다' }

    // 소유한 클럽이 있으면 탈퇴 불가 (clubs.owner_id ON DELETE RESTRICT 및 클럽 탈퇴 정책과 일관)
    const { count: ownedClubs } = await supabase
        .from('clubs')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', user.id)
    if (ownedClubs && ownedClubs > 0) {
        return { error: '소유한 클럽을 먼저 삭제하거나 양도해야 탈퇴할 수 있습니다.' }
    }

    // 모든 클럽에서 탈퇴 (본인 멤버십 행 전부 삭제)
    await supabase.from('club_members').delete().eq('user_id', user.id)

    // 개인정보 익명화 + 탈퇴 마킹. 과거 경기/레이팅의 player id는 보존되어 '탈퇴한 회원'으로 표시된다.
    const { error } = await supabase
        .from('users')
        .update({
            name: '탈퇴한 회원',
            nickname: '탈퇴한 회원',
            email: `deleted+${user.id}@deleted.local`,
            phone: null,
            profile_image: null,
            gender: null,
            dominant_hand: null,
            tennis_start_date: null,
            racket_brand: null,
            racket_model: null,
            stats_hidden: true,
            deleted_at: new Date().toISOString(),
        })
        .eq('id', user.id)
    if (error) return { error: error.message }

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

/**
 * 소셜 로그인 시작 — provider 동의 화면 URL로 보낸다.
 *
 * 흐름은 세 주소를 지난다(docs/social-login.md §1):
 *   우리 앱 → provider 동의 화면 → **Supabase**(`.../auth/v1/callback`) → **우리 앱**(`/auth/callback`)
 * 그래서 provider 콘솔에 등록할 리디렉션 URI는 Supabase 주소이고, 여기서 넘기는 `redirectTo`는
 * 우리 앱 주소다. 둘을 헷갈리면 `redirect_uri_mismatch`가 난다.
 *
 * Server Action인 이유는 이 레포의 "쓰기는 Server Action으로만" 규칙 때문이고, 덕분에
 * `SocialLoginButtons`를 서버 컴포넌트인 채로 둘 수 있다.
 */
export async function signInWithOAuthAction(formData: FormData): Promise<void> {
    const provider = formData.get('provider')
    // 카카오는 콘솔 설정(비즈 앱 전환·Client Secret)이 끝나면 버튼만 노출하면 된다 — 배선은 같다.
    if (provider !== 'google' && provider !== 'kakao') redirect('/login')

    const rawNext = formData.get('next')
    const next = typeof rawNext === 'string' && isSafeNext(rawNext) ? rawNext : null

    // redirectTo 베이스 — requestPasswordResetAction과 같은 관용구
    const headerStore = await headers()
    const origin =
        process.env.NEXT_PUBLIC_SITE_URL ||
        headerStore.get('origin') ||
        `https://${headerStore.get('host')}`

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
            redirectTo: `${origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`,
        },
    })
    // ⚠ redirect()는 예외를 던진다 — try/catch 안에 두면 안 된다
    if (error || !data.url) redirect(`/login?error=${OAUTH_ERROR_PARAM}`)

    redirect(data.url)
}

'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { isSafeNext } from '@/lib/supabase/middleware'
import { personalNavHref } from '@/lib/nav-items'
import { parseYearMonth, toStartDateString } from '@/lib/format/year-month'
import {
    isGenderValue, isHandValue, isSignupNtrp, normalizeRacketModel, resolveRacketBrand,
} from '@/lib/profile/signup-fields'
import { checkIdentityFields, isNicknameConflict } from '@/lib/profile/identity-fields'
import { NICKNAME_TAKEN_MESSAGE } from '@/lib/profile/nickname'
import { WELCOME_NOTICE } from '@/lib/onboarding'
import { AVATAR_UPLOAD_FAILED, avatarExtension, avatarFileError } from '@/lib/profile/avatar-limits'

export type OnboardingActionState = { error: string } | null

/**
 * 소셜 가입자의 테니스 정보 1회 입력 — **비어 있을 때만** 채운다.
 *
 * `updateProfileAction`을 열지 않는 이유: 그쪽은 "가입 시 1회 입력, 변경 불가" 정책으로
 * 이름·성별·주력손·시작일·NTRP를 update에서 빼고 있고, 그 정책은 그대로 지켜야 한다.
 * 여기서 바꾸는 것은 "변경 불가"를 **"입력 후 변경 불가"**로 읽는 것뿐이다 — 이미 값이 있는
 * 기존 회원은 아래 가드에 걸려 여전히 잠긴다.
 *
 * 검증은 `signupAction`과 **같은 것**을 본다. 두 경로가 각자 검사하면 소셜 가입자만 규칙이
 * 느슨해진다(0079가 가입·프로필 설정에 `checkIdentityFields`를 함께 넣은 것과 같은 이유).
 */
export async function completeProfileAction(
    _prevState: OnboardingActionState,
    formData: FormData
): Promise<OnboardingActionState> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    // 이미 채운 사람은 여기로 오지 않는다 — 직접 POST하는 경로를 막는 가드다.
    const { data: current } = await supabase
        .from('users')
        .select('ntrp')
        .eq('id', user.id)
        .single()
    if (current?.ntrp != null) return { error: '이미 입력된 정보입니다.' }

    // 개인정보 수집·이용 동의 — 폼의 required는 브라우저가 지키는 것이라 서버에서 한 번 더 본다.
    // `signupAction`의 거울이다: 소셜 경로만 이 절차를 건너뛰고 있었는데 수집하는 정보는 같다.
    if (formData.get('agree_privacy') !== 'true') {
        return { error: '개인정보 수집·이용에 동의해 주세요.' }
    }

    const gender = formData.get('gender')
    const dominantHand = formData.get('dominant_hand')
    const ntrp = formData.get('ntrp')
    if (!isGenderValue(gender) || !isHandValue(dominantHand)) {
        return { error: '성별과 주력손을 선택해 주세요.' }
    }
    if (!isSignupNtrp(ntrp)) {
        return { error: 'NTRP를 1.0~4.0 사이에서 선택해 주세요.' }
    }

    // 시작일은 Week 56부터 필수다 — 한 번 비우면 어느 화면에서도 채울 수 없었기 때문이다.
    // 문구는 signupAction과 한 글자도 다르지 않아야 한다(두 경로가 같은 말을 해야 한다).
    const startRaw = ((formData.get('tennis_start_date') as string | null) ?? '').trim()
    if (!startRaw) return { error: '테니스 시작일을 입력해 주세요.' }
    const parsedStart = parseYearMonth(startRaw)
    if (!parsedStart) return { error: '테니스 시작일은 2022/07 형식(년/월)으로 입력해 주세요.' }
    const tennisStartDate = toStartDateString(parsedStart)

    // 이름·닉네임도 함께 받는다 — 둘 다 트리거가 provider 값에서 만든 임시값이다(0084).
    // `name`을 넘기면 `validateName`(1~20자·숫자 금지)이 따라온다 — 가입 폼과 같은 검증이다.
    const identity = checkIdentityFields({
        name: formData.get('name'),
        nickname: formData.get('nickname'),
        phone: formData.get('phone'),
    })
    if (!identity.ok) return { error: identity.error }

    // 프로필 사진 — 손대지 않았으면 provider 사진을 그대로 둔다(updateProfileAction과 같은 순서).
    let profileImage: string | undefined
    const avatar = formData.get('avatar') as File | null
    const defaultAvatar = (formData.get('default_avatar') as string) || null
    if (avatar && avatar.size > 0) {
        const avatarError = avatarFileError(avatar, 'upload')
        if (avatarError) return { error: avatarError }
        const path = `${user.id}/avatar.${avatarExtension(avatar.type)}`
        const { error: upErr } = await supabase.storage.from('avatars').upload(path, avatar, { upsert: true })
        if (upErr) return { error: AVATAR_UPLOAD_FAILED }
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
        profileImage = urlData.publicUrl
    } else if (defaultAvatar) {
        profileImage = defaultAvatar
    }

    const { error } = await supabase
        .from('users')
        .update({
            name: identity.values.name,
            nickname: identity.values.nickname,
            ...(profileImage ? { profile_image: profileImage } : {}),
            phone: identity.values.phone || null,
            gender,
            dominant_hand: dominantHand,
            ntrp: Number(ntrp),
            tennis_start_date: tennisStartDate,
            racket_brand: resolveRacketBrand(
                formData.get('racket_choice') as string | null,
                formData.get('racket_other') as string | null
            ),
            racket_model: normalizeRacketModel(formData.get('racket_model') as string | null),
        })
        .eq('id', user.id)
    // 화면 검사를 통과한 뒤 남이 같은 닉네임을 먼저 저장한 경우 — 인덱스가 잡는다(0079).
    if (isNicknameConflict(error)) return { error: NICKNAME_TAKEN_MESSAGE }
    if (error) return { error: error.message }

    const rawNext = formData.get('next')
    const next = typeof rawNext === 'string' && isSafeNext(rawNext) ? rawNext : null

    // 게이트가 (main) 레이아웃에 있으므로 레이아웃 캐시를 비워야 방금 채운 값이 보인다
    revalidatePath('/', 'layout')
    // 가입 폼과 같은 착지 — 완료 신호가 없어 사용자가 「회원가입 안됨」으로 인지했다(U-6)
    redirect(next ?? `${personalNavHref(user.id)}&notice=${WELCOME_NOTICE}`)
}

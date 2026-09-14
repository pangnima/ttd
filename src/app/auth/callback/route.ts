// 소셜 로그인의 착지점 — provider 동의 → Supabase(`/auth/v1/callback`) → **여기**.
//
// 기존 `/auth/confirm`과 따로 두는 이유는 계약이 다르기 때문이다. 그쪽은 비밀번호 재설정 메일의
// `token_hash & type`을 `verifyOtp`로 검증하고, 이쪽은 OAuth의 `code`를 세션으로 교환한다.
// 파라미터도 호출 API도 겹치지 않아 한 핸들러에 합치면 분기만 늘어난다.
//
// ⚠ `/auth/confirm`의 `next`에는 `isSafeNext` 검사가 빠져 있다. 그 구현을 답습하지 않는다.
import { type NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { isSafeNext } from '@/lib/supabase/middleware'
import { DELETED_ERROR_PARAM, OAUTH_ERROR_PARAM } from '@/lib/auth/auth-error-messages'
import { personalNavHref } from '@/lib/nav-items'
import { PROFILE_ONBOARDING_PATH } from '@/lib/profile/onboarding-gate'

export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl
    const code = searchParams.get('code')
    const rawNext = searchParams.get('next')
    const next = isSafeNext(rawNext) ? rawNext : null

    const fail = (reason: string) => redirectTo(request, `/login?error=${reason}`)

    if (!code) return fail(OAUTH_ERROR_PARAM)

    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) return fail(OAUTH_ERROR_PARAM)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return fail(OAUTH_ERROR_PARAM)

    // 탈퇴 차단 — loginAction과 같은 집합을 봐야 한다. 이 검사가 없으면 익명화된
    // '탈퇴한 회원'이 소셜 경로로 그대로 로그인된다(비밀번호 경로에만 있던 구멍).
    const { data: profile } = await supabase
        .from('users')
        .select('deleted_at, ntrp')
        .eq('id', user.id)
        .single()

    if (profile?.deleted_at) {
        await supabase.auth.signOut()
        return fail(DELETED_ERROR_PARAM)
    }

    // 테니스 정보가 비어 있으면 완성 화면으로. 게이트는 (main) 레이아웃에도 있지만,
    // 여기서 한 번 더 보내면 첫 진입에 화면이 한 번 덜 깜빡인다.
    const dest = profile?.ntrp == null
        ? `${PROFILE_ONBOARDING_PATH}${next ? `?next=${encodeURIComponent(next)}` : ''}`
        : (next ?? personalNavHref(user.id))

    return redirectTo(request, dest)
}

/**
 * 로드밸런서(Vercel 등) 뒤에서는 `nextUrl.origin`이 내부 주소가 된다 — 원래 호스트를 복원한다.
 * 개발에서는 x-forwarded-host가 없거나 localhost라 그대로 origin을 쓴다.
 */
function redirectTo(request: NextRequest, path: string): NextResponse {
    const forwardedHost = request.headers.get('x-forwarded-host')
    if (process.env.NODE_ENV !== 'development' && forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${path}`)
    }
    return NextResponse.redirect(new URL(path, request.nextUrl.origin))
}

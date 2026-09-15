// 비밀번호 재설정 메일 링크의 진입점.
// 메일 템플릿이 token_hash & type=recovery 로 이 핸들러를 호출하면,
// verifyOtp로 임시 세션 쿠키를 설정한 뒤 next(기본 /reset-password)로 이동한다.
import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSafeNext } from '@/lib/supabase/middleware'
import { RESET_EXPIRED_ERROR_PARAM } from '@/lib/auth/auth-error-messages'

export async function GET(request: NextRequest) {
    const { searchParams, origin } = request.nextUrl
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type') as EmailOtpType | null
    // 오픈 리다이렉트 방지 — 메일 링크의 쿼리는 누구나 고쳐 쓸 수 있다(/auth/callback과 같은 검사)
    const nextParam = searchParams.get('next')
    const next = isSafeNext(nextParam) ? nextParam : '/reset-password'

    if (tokenHash && type) {
        const supabase = await createClient()
        const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
        if (!error) {
            return NextResponse.redirect(new URL(next, origin))
        }
    }
    // 토큰 누락/만료/재사용 — 말없이 로그인으로 보내지 않고 비밀번호 찾기에서 이유를 말한다(Week 61)
    return NextResponse.redirect(new URL(`/forgot-password?error=${RESET_EXPIRED_ERROR_PARAM}`, origin))
}

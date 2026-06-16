// 비밀번호 재설정 메일 링크의 진입점.
// 메일 템플릿이 token_hash & type=recovery 로 이 핸들러를 호출하면,
// verifyOtp로 임시 세션 쿠키를 설정한 뒤 next(기본 /reset-password)로 이동한다.
import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    const { searchParams, origin } = request.nextUrl
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type') as EmailOtpType | null
    const next = searchParams.get('next') ?? '/reset-password'

    if (tokenHash && type) {
        const supabase = await createClient()
        const { error } = await supabase.auth.verifyOtp({
            type,
            token_hash: tokenHash,
        })
        if (!error) {
            return NextResponse.redirect(new URL(next, origin))
        }
    }

    // 토큰 누락/만료/검증 실패 시 로그인으로 회귀
    return NextResponse.redirect(new URL('/login', origin))
}

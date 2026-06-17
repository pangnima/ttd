// 핵심 목적: 매 요청마다 Supabase 세션 토큰을 자동 갱신한다.
// getUser() 호출 자체가 토큰 갱신 트리거이므로 반드시 호출되어야 함.
// 인증 가드(리다이렉트) 도 이 함수에서 함께 처리.
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/supabase'

// 오픈 리다이렉트 방지: 같은 사이트 내부 경로(/ 로 시작, // 프로토콜상대 제외)만 허용.
export function isSafeNext(next: string | null | undefined): next is string {
    return !!next && next.startsWith('/') && !next.startsWith('//')
}

export async function updateSession(request: NextRequest) {
    // supabaseResponse를 초기화한 뒤 setAll 내부에서 재생성하는 이유:
    // @supabase/ssr이 갱신된 쿠키를 응답에 실을 수 있도록 NextResponse 인스턴스를 교체해야 함.
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // getUser() 호출이 세션 토큰 갱신 트리거 — 이 줄을 제거하면 세션이 만료됨
    const {
        data: { user },
    } = await supabase.auth.getUser()

    const path = request.nextUrl.pathname

    // 보호 라우트: 비로그인 시 /login 리다이렉트.
    // /clubs/join(초대 미리보기)은 공유 링크라 비로그인·크롤러에 공개한다(OG 미리보기).
    const isMainRoute =
        (path.startsWith('/clubs') && !path.startsWith('/clubs/join')) ||
        path.startsWith('/profile') ||
        path.startsWith('/me')
    if (isMainRoute && !user) {
        // 원래 가려던 경로(+쿼리)를 next로 넘겨 로그인 후 복귀시킨다 (예: 초대 링크).
        const intended = path + request.nextUrl.search
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.search = ''
        url.searchParams.set('next', intended)
        return NextResponse.redirect(url)
    }

    // 인증 라우트: 이미 로그인된 사용자는 next(있으면) 또는 /clubs로 리다이렉트
    const isAuthRoute = path === '/login' || path === '/signup'
    if (isAuthRoute && user) {
        const next = request.nextUrl.searchParams.get('next')
        const dest = isSafeNext(next) ? next : '/clubs'
        return NextResponse.redirect(new URL(dest, request.url))
    }

    return supabaseResponse
}

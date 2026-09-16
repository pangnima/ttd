// 핵심 목적: 매 요청마다 Supabase 세션 토큰을 자동 갱신한다.
// getUser() 호출 자체가 토큰 갱신 트리거이므로 반드시 호출되어야 함.
// 인증 가드(리다이렉트) 도 이 함수에서 함께 처리.
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/supabase'
import { personalNavHref } from '@/lib/nav-items'

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

    // 서버 액션(POST)은 리다이렉트하지 않는다(F-19). 세션이 남은 채 열려 있던 /login(뒤로 가기·다른 탭 로그인)에서
    // 제출하거나 보호 화면에서 세션이 만료된 뒤 제출하면, 307을 받은 액션 응답이 HTML이 되어
    // 「An unexpected response was received from the server」로 터진다. 이 앱이 받는 POST는 서버 액션뿐이고
    // 액션은 저마다 getUser() null 분기를 가지므로(데이터는 RLS가 지킨다) 세션 갱신만 하고 통과시킨다.
    if (request.method === 'POST') return supabaseResponse

    // 보호 라우트: 비로그인 시 /login 리다이렉트.
    // /clubs/join(초대 미리보기)은 공유 링크라 비로그인·크롤러에 공개한다(OG 미리보기).
    // /onboarding은 (main) 밖이지만 로그인한 사람만 쓰는 화면이라 같은 가드를 받는다
    // (그 레이아웃 안에 두면 게이트가 스스로를 리다이렉트해 루프가 된다 — lib/profile/onboarding-gate.ts)
    const isMainRoute =
        (path.startsWith('/clubs') && !path.startsWith('/clubs/join')) ||
        path.startsWith('/profile') ||
        path.startsWith('/me') ||
        path.startsWith('/match-rooms') ||
        path.startsWith('/onboarding')
    if (isMainRoute && !user) {
        // 원래 가려던 경로(+쿼리)를 next로 넘겨 로그인 후 복귀시킨다 (예: 초대 링크).
        const intended = path + request.nextUrl.search
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.search = ''
        url.searchParams.set('next', intended)
        return NextResponse.redirect(url)
    }

    // 인증 라우트: 이미 로그인된 사용자는 next(있으면) 또는 내 전적 > 개인으로 리다이렉트.
    // 찾기 두 화면도 로그인 이전의 화면이다(U-4) — 헤더가 없어 로그인한 사람에게는 돌아갈 길이 로고뿐이었다
    const isAuthRoute = path === '/login' || path === '/signup' || path === '/find-id' || path === '/forgot-password'
    if (isAuthRoute && user) {
        const next = request.nextUrl.searchParams.get('next')
        const dest = isSafeNext(next) ? next : personalNavHref(user.id)
        return NextResponse.redirect(new URL(dest, request.url))
    }

    // 랜딩(/): 로그인 상태면 서비스 소개가 아니라 '개인' 메뉴로 보낸다.
    // 착지 경로는 로그인 직후와 같아야 하므로 personalNavHref 하나만 본다.
    if (path === '/' && user) {
        return NextResponse.redirect(new URL(personalNavHref(user.id), request.url))
    }

    return supabaseResponse
}

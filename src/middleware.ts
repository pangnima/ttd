import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
    return await updateSession(request)
}

export const config = {
    // _next/static, _next/image, favicon, 이미지 파일은 제외하고 나머지 모든 경로에 미들웨어 적용.
    // 모든 페이지 요청마다 Supabase getUser()가 호출되므로 인증이 필요 없는 정적 경로는 반드시 제외.
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}

// Server Component / Server Action / Route Handler 전용.
// Client Component에서는 `client.ts`의 createClient를 사용할 것.
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

export async function createClient() {
    const cookieStore = await cookies()

    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // Server Component는 read-only이므로 쿠키 set 실패를 무시.
                        // 실제 세션 쿠키 갱신은 middleware.ts의 updateSession에서 처리됨.
                    }
                },
            },
        }
    )
}

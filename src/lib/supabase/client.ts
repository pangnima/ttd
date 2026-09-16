// Client Component 전용 — 브라우저 환경에서만 사용.
// Server Component / Server Action에서는 반드시 `server.ts`의 createClient를 사용할 것.
// (anon key 노출은 의도된 동작이며, RLS가 실제 접근 제어를 담당)
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'
import { supabaseEnv } from '@/lib/supabase/env'

export function createClient() {
    const { url, anonKey } = supabaseEnv()
    return createBrowserClient<Database>(url, anonKey)
}

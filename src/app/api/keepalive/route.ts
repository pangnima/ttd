import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseEnv } from '@/lib/supabase/env'
import type { Database } from '@/types/supabase'

export const dynamic = 'force-dynamic'

/**
 * Supabase 무료 플랜 일시정지 방지(Week 70) — Vercel Cron이 매일 한 번 부른다(`vercel.json` crons).
 *
 * 무료 프로젝트는 **7일간 요청이 없으면 일시정지**되고, 정지된 뒤 첫 방문자는 로그인조차 못 한다.
 * 운영 초기에는 며칠씩 아무도 안 들어오는 날이 있으므로 DB에 닿는 요청을 하루 한 번 만들어 둔다.
 * Cron은 Production 배포에서만 돌므로 자연히 prod 프로젝트만 건드린다.
 *
 * 쿼리는 anon이 부를 수 있는 가장 가벼운 RPC(`is_nickname_taken`) — 실제 SELECT가 DB까지 가야 활동으로 센다
 * (RLS에 막혀 빈 결과가 오는 테이블 조회는 피한다). 쓰기 없음.
 *
 * `CRON_SECRET`(Vercel 환경변수)이 있으면 Vercel이 `Authorization: Bearer <secret>`을 실어 보내고 여기서 대조한다.
 * 없으면 열린 채로 둔다 — 읽기 한 번뿐이라 위험이 낮고, 설정 전이라도 정지 방지는 되어야 한다.
 */
export async function GET(request: Request) {
    const secret = process.env.CRON_SECRET
    if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
        return NextResponse.json({ ok: false }, { status: 401 })
    }

    const { url, anonKey } = supabaseEnv()
    const supabase = createClient<Database>(url, anonKey, { auth: { persistSession: false } })
    const { error } = await supabase.rpc('is_nickname_taken', { p_nickname: 'keepalive' })
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, at: new Date().toISOString() })
}

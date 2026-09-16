/**
 * Supabase 연결 정보의 단일 출처 — 브라우저·서버·미들웨어 클라이언트 셋이 같은 값을 읽는다.
 *
 * 값이 비어 있으면 Supabase SDK가 던지는 영문 에러 대신 어느 키가 어디에 빠졌는지 한글로 말한다
 * (처음 실행하는 사람이 가장 먼저 만나는 실패라서). 어느 프로젝트(dev/prod)에 붙는지는 이 값이 정한다 —
 * 로컬 `.env.local`은 언제나 dev, prod 값은 Vercel Production env에만 둔다(CLAUDE.md 「환경」).
 *
 * ⚠ `process.env.NEXT_PUBLIC_…`를 **정적으로** 적어야 한다 — Next.js는 그 표현식을 빌드 때 브라우저 번들에
 * 문자열로 심는다. `process.env[name]`처럼 동적으로 읽으면 서버에서는 되고 브라우저에서는 undefined다.
 */
export type SupabaseEnv = { url: string; anonKey: string }

function missing(name: string): never {
    throw new Error(
        `${name}이(가) 설정되어 있지 않습니다. 로컬이면 .env.example을 .env.local로 복사해 값을 채우고, ` +
            `배포면 Vercel의 Environment Variables를 확인하세요.`,
    )
}

export function supabaseEnv(): SupabaseEnv {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    return {
        url: url || missing('NEXT_PUBLIC_SUPABASE_URL'),
        anonKey: anonKey || missing('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    }
}

/**
 * 소셜 provider 브랜드 마크 — **색이 우리 것이 아니다.**
 *
 * 이 hex들은 구글 브랜드 가이드가 정한 값이라 테마·팔레트 교체 대상이 아니고, 시맨틱 토큰으로
 * 옮기면 도리어 남의 로고를 우리 색으로 칠하는 셈이 된다. 그래서 마크만 이 파일로 떼어
 * `colors.test.ts`의 ALLOWLIST에 넣는다(`lib/og/brand.ts`와 같은 부류의 예외).
 * 버튼 본체(`social-login-buttons.tsx`)는 우리 토큰을 쓰므로 가드 아래 그대로 남는다.
 */

/** 구글 'G' — lucide-react에 없다 */
export function GoogleMark({ className = 'size-4 shrink-0' }: { className?: string }) {
    return (
        <svg viewBox="0 0 18 18" aria-hidden className={className}>
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
            <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
        </svg>
    )
}

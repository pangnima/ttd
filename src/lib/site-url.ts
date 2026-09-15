/**
 * 배포 도메인 — `NEXT_PUBLIC_SITE_URL`이 비어 있을 때의 폴백.
 *
 * metadataBase·OG 이미지 절대 URL에만 쓴다. 인증 리다이렉트(`signInWithOAuthAction`·
 * `requestPasswordResetAction`)는 요청 헤더(origin/host)를 폴백으로 쓰므로 여기를 보지 않는다 —
 * 프리뷰 배포에서는 요청 호스트가 맞는 답이기 때문이다.
 *
 * ⚠ 도메인을 옮기면 이 값만으로는 끝나지 않는다. Supabase Authentication › URL Configuration의
 * Site URL·Redirect URLs와 Vercel의 `NEXT_PUBLIC_SITE_URL`을 함께 바꿔야 한다 — 옛 도메인이
 * Site URL에 남으면 OAuth 착지가 죽은 호스트로 가서 Vercel `404 DEPLOYMENT_NOT_FOUND`가 난다(Week 59).
 */
export const DEFAULT_SITE_URL = 'https://baselineplay.vercel.app'

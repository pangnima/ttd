/**
 * 비밀번호 찾기의 배달 수단 — **메일 재설정을 켤지**를 한 곳에서 정한다(Week 61).
 *
 * 링크형 재설정(`requestPasswordResetAction` → `/auth/confirm` → `/reset-password`)은 코드가 다 있지만
 * 메일이 나가려면 커스텀 SMTP가 있어야 하고, 그러려면 발신 도메인이 필요하다. 도메인 구매 전까지
 * Supabase 기본 SMTP는 조직 팀원 주소에만 배달하므로, 그 상태에서 폼을 보이면 화면은 "보냈습니다"라
 * 말하고 메일은 오지 않는 조용한 고장이 된다. 그래서 그동안은 **운영자 문의 안내**로 대신한다.
 *
 * 켜는 순서(코드는 이 값 하나): Resend 가입 → 도메인 인증 → Supabase Authentication › SMTP Settings
 * (host smtp.resend.com · port 465 · user resend · password = API key · sender noreply@도메인) →
 * auth_logs `mail.send`의 `mail_from`이 우리 도메인인지 확인 → `true`.
 */
export const PASSWORD_RESET_MAIL_ENABLED = false

/**
 * 운영자 문의 이메일(Week 61 결정 — 이메일 주소 표시). 로그인 전 화면에 그대로 노출되므로 전용 주소로
 * 바꾸고 싶으면 여기만 고친다. null이면 안내 카드가 채널 없이 일반 문구만 보인다.
 */
export const ADMIN_CONTACT_EMAIL: string | null = 'pangnima@gmail.com'

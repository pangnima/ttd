// Supabase Auth가 반환하는 영문 에러 메시지를 사용자용 한글 메시지로 변환한다.
// signInWithPassword / signUp / resetPasswordForEmail / updateUser 등 인증 액션 공용.

// 부분 일치(소문자 비교) 규칙 — Supabase 메시지가 버전에 따라 미세하게 달라질 수 있어
// 정확 일치 대신 핵심 키워드 포함 여부로 매핑한다.
const ERROR_RULES: ReadonlyArray<{ match: string; message: string }> = [
    { match: 'invalid login credentials', message: '이메일 또는 비밀번호가 올바르지 않습니다.' },
    { match: 'email not confirmed', message: '이메일 인증이 완료되지 않았습니다. 메일함을 확인해 주세요.' },
    { match: 'user already registered', message: '이미 가입된 이메일입니다.' },
    { match: 'already been registered', message: '이미 가입된 이메일입니다.' },
    { match: 'password should be at least', message: '비밀번호는 6자 이상이어야 합니다.' },
    { match: 'unable to validate email address', message: '이메일 형식이 올바르지 않습니다.' },
    { match: 'invalid email', message: '이메일 형식이 올바르지 않습니다.' },
    { match: 'email rate limit exceeded', message: '잠시 후 다시 시도해 주세요.' },
    { match: 'for security purposes', message: '잠시 후 다시 시도해 주세요.' },
    { match: 'over_email_send_rate_limit', message: '잠시 후 다시 시도해 주세요.' },
    { match: 'same as the old password', message: '기존 비밀번호와 다른 비밀번호를 입력해 주세요.' },
]

const FALLBACK_MESSAGE = '오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'

/** Supabase 영문 에러 메시지를 한글로 변환한다. 미매칭 시 일반 폴백 메시지 반환. */
export function mapAuthError(message: string | null | undefined): string {
    if (!message) return FALLBACK_MESSAGE
    const lower = message.toLowerCase()
    const rule = ERROR_RULES.find((r) => lower.includes(r.match))
    return rule ? rule.message : FALLBACK_MESSAGE
}

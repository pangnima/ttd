/**
 * 로그인 아이디 규칙 — DB `users_login_id_check`(0085)의 거울.
 *
 * 영문 소문자·숫자·밑줄 4~20자. 대문자는 오류가 아니라 **소문자로 정규화**한다(트리거도 같은 정규화).
 * `@`가 들어갈 수 없으므로 로그인 칸 하나에서 이메일과 아이디를 `looksLikeEmail`로 가를 수 있다.
 * 가입 시 1회 입력 후 변경 불가(이름과 같은 정책, 앱 가드). 유일성의 권위는 `users_login_id_unique_idx`.
 */

export const LOGIN_ID_MIN_LEN = 4
export const LOGIN_ID_MAX_LEN = 20

/** DB CHECK와 같은 표현식 */
export const LOGIN_ID_PATTERN = /^[a-z0-9_]{4,20}$/

export const LOGIN_ID_TAKEN_MESSAGE = '이미 사용 중인 아이디입니다.'

/** 앞뒤 공백 제거 + 소문자 */
export function normalizeLoginId(value: string | null | undefined): string {
    return (value ?? '').trim().toLowerCase()
}

/** 규칙을 지키면 null, 아니면 사용자에게 보일 문구. 정규화된 값을 넘길 것 */
export function validateLoginId(loginId: string): string | null {
    if (loginId.length === 0) return '아이디를 입력해 주세요.'
    if (loginId.length < LOGIN_ID_MIN_LEN) return `아이디는 ${LOGIN_ID_MIN_LEN}자 이상이어야 합니다.`
    if (loginId.length > LOGIN_ID_MAX_LEN) return `아이디는 ${LOGIN_ID_MAX_LEN}자 이하여야 합니다.`
    if (!LOGIN_ID_PATTERN.test(loginId)) return '아이디는 영문 소문자·숫자·밑줄(_)만 쓸 수 있습니다.'
    return null
}

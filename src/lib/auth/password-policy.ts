/**
 * 비밀번호 규칙 — **단일 출처**(Week 60).
 *
 * 가입(`signupAction`)·재설정(`resetPasswordAction`)·변경(`updatePasswordAction`) 세 서버 액션과
 * 세 폼의 체크리스트(`PasswordRulesHint`)가 같은 배열을 읽는다. 그전까지 재설정·변경은 `length < 6`
 * 리터럴이었고 가입은 서버 검사가 아예 없었다(클라 `minLength`와 Supabase 기본 6에 기대고 있었다).
 *
 * 최종 방어선은 Supabase Auth의 최소 길이 설정(대시보드, 8)이고 여기는 그 거울이자 편의다 —
 * 0079가 "화면 검사는 편의일 뿐 최종 방어선은 인덱스"라 적은 것과 같은 구조. 문자 종류(영문·숫자·
 * 특수문자)는 앱이 쥔다: 대시보드 프리셋은 대소문자를 가르는데 우리 규칙은 대소 무관이라 정확히
 * 맞는 프리셋이 없다. 특수문자 집합은 Supabase가 허용하는 집합 그대로다 — 서버 옵션을 켜도
 * 앱이 통과시킨 값이 서버에서 막히지 않는다.
 */

export const PASSWORD_MIN_LEN = 8

/** Supabase Auth password requirements가 인정하는 특수문자 집합(공식 문서) */
export const PASSWORD_SYMBOLS = '!@#$%^&*()_+-=[]{};\'\\:"|<>?,./`~'

export type PasswordRuleKey = 'length' | 'letter' | 'digit' | 'symbol'

export type PasswordRule = {
    key: PasswordRuleKey
    /** 체크리스트 한 줄 */
    label: string
    test: (password: string) => boolean
}

const SYMBOL_PATTERN = new RegExp(`[${PASSWORD_SYMBOLS.replace(/[\]\\^-]/g, '\\$&')}]`)

export const PASSWORD_RULES: ReadonlyArray<PasswordRule> = [
    { key: 'length', label: `${PASSWORD_MIN_LEN}자 이상`, test: (pw) => pw.length >= PASSWORD_MIN_LEN },
    { key: 'letter', label: '영문 포함', test: (pw) => /[A-Za-z]/.test(pw) },
    { key: 'digit', label: '숫자 포함', test: (pw) => /[0-9]/.test(pw) },
    { key: 'symbol', label: '특수문자 포함', test: (pw) => SYMBOL_PATTERN.test(pw) },
]

/** 서버 액션과 Supabase 에러 매핑이 함께 쓰는 문구 — 규칙이 바뀌면 여기만 고친다 */
export const PASSWORD_POLICY_MESSAGE =
    `비밀번호는 ${PASSWORD_MIN_LEN}자 이상, 영문·숫자·특수문자를 각각 1자 이상 포함해야 합니다.`

/** 아직 충족하지 못한 규칙 — 화면 체크리스트용 */
export function unmetPasswordRules(password: string): PasswordRuleKey[] {
    return PASSWORD_RULES.filter((rule) => !rule.test(password)).map((rule) => rule.key)
}

/** 규칙을 다 지키면 null, 아니면 사용자에게 보일 문구 — 서버 액션용 */
export function validatePassword(password: string | null | undefined): string | null {
    if (!password || unmetPasswordRules(password).length > 0) return PASSWORD_POLICY_MESSAGE
    return null
}

/** `/profile/[id]?notice=weak_password` — loginAction이 Supabase의 weakPassword 신호를 받았을 때 붙인다 */
export const WEAK_PASSWORD_NOTICE = 'weak_password'

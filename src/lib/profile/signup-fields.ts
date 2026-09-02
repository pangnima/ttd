/**
 * 회원가입 폼 선택지 상수·정규화 헬퍼 (순수 함수, DB 접근 없음).
 * NTRP·라켓·시작일은 가입 시 1회 입력하며 프로필 설정에서는 읽기 전용이다.
 */

export const GENDER_OPTIONS = [
    { value: 'male', label: '남성' },
    { value: 'female', label: '여성' },
] as const

export const HAND_OPTIONS = [
    { value: 'right', label: '오른손' },
    { value: 'left', label: '왼손' },
] as const

export type GenderValue = (typeof GENDER_OPTIONS)[number]['value']
export type HandValue = (typeof HAND_OPTIONS)[number]['value']

export function isGenderValue(v: unknown): v is GenderValue {
    return GENDER_OPTIONS.some((o) => o.value === v)
}

export function isHandValue(v: unknown): v is HandValue {
    return HAND_OPTIONS.some((o) => o.value === v)
}

/** 가입 시 선택 가능한 자가선언 NTRP — 1.0~4.0, 0.5 단위 (DB CHECK 1~7보다 좁음, 기존 4.5+ 회원 값은 보존) */
export const SIGNUP_NTRP_OPTIONS = ['1.0', '1.5', '2.0', '2.5', '3.0', '3.5', '4.0'] as const
export type SignupNtrp = (typeof SIGNUP_NTRP_OPTIONS)[number]
export const SIGNUP_NTRP_DEFAULT: SignupNtrp = '3.0'

export function isSignupNtrp(v: unknown): v is SignupNtrp {
    return SIGNUP_NTRP_OPTIONS.some((o) => o === v)
}

/** 주력 라켓 라디오 선택지. 'other'는 브랜드명 직접 입력 */
export const RACKET_BRAND_OPTIONS = [
    { value: 'wilson', label: '윌슨' },
    { value: 'head', label: '헤드' },
    { value: 'yonex', label: '요넥스' },
    { value: 'babolat', label: '바볼랏' },
    { value: 'other', label: '기타' },
] as const
export type RacketBrandChoice = (typeof RACKET_BRAND_OPTIONS)[number]['value']

/** users.racket_brand CHECK(char_length <= 30)와 동일 */
export const RACKET_BRAND_MAX_LEN = 30

/**
 * 라디오 선택 + 기타 입력 → users.racket_brand 저장값.
 * 프리셋은 한글 라벨('윌슨')을 그대로 저장해 표시가 `value ?? '미입력'`으로 끝나게 한다.
 * 'other'는 trim·길이 제한 후 저장, 빈 문자열·미선택·알 수 없는 값은 null.
 */
export function resolveRacketBrand(
    choice: string | null | undefined,
    otherText: string | null | undefined
): string | null {
    if (!choice) return null
    if (choice === 'other') {
        const text = (otherText ?? '').trim().slice(0, RACKET_BRAND_MAX_LEN)
        return text.length > 0 ? text : null
    }
    const preset = RACKET_BRAND_OPTIONS.find((o) => o.value === choice && o.value !== 'other')
    return preset ? preset.label : null
}

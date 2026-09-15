/**
 * 회원가입 폼 선택지 상수·정규화 헬퍼 (순수 함수, DB 접근 없음).
 * 이름·성별·주력손·시작일·NTRP는 가입 시 1회 입력하고 프로필 설정에서는 읽기 전용이다.
 * (라켓은 0036에서 '변경 불가' 정책이 철회되어 프로필 설정에서도 수정 가능하다.)
 *
 * 닉네임은 프로필 설정에서 수정 가능해 이 모듈이 아니라 `nickname.ts`가 규칙을 쥔다.
 */

/** users_name_check(0079)와 동일 — 앞뒤 공백을 뺀 길이 */
export const NAME_MAX_LEN = 20

/**
 * 실명 검증. 문제가 있으면 화면 문구를, 없으면 null을 돌려준다(`validateNickname`과 같은 결).
 *
 * ⚠ 숫자 금지는 **앱에만 있다.** DB CHECK를 함께 걸려다 되돌렸다 — 0081 주석 참고:
 *    `not valid`도 기존 행의 UPDATE는 검사하는데, 이름에 숫자가 든 개발·E2E 계정 52건이
 *    프로필 설정에서 닉네임만 바꿔도 저장에 실패하게 된다.
 *    이름을 쓰는 경로가 가입과 탈퇴 익명화 둘뿐이고 가입 후 변경 불가라 앱 가드로 실질 방어는 된다.
 */
export function validateName(value: string | null | undefined): string | null {
    const name = (value ?? '').trim()
    if (name.length === 0) return '이름을 입력해 주세요.'
    if (name.length > NAME_MAX_LEN) return `이름은 ${NAME_MAX_LEN}자 이하여야 합니다.`
    if (/[0-9]/.test(name)) return '이름에는 숫자를 넣을 수 없습니다.'
    return null
}

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
/** users.racket_model CHECK(char_length <= 40)와 동일 */
export const RACKET_MODEL_MAX_LEN = 40

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

/** 저장된 racket_brand → 편집 폼 초기값(라디오 선택 + 기타 텍스트). 프리셋 라벨이 아니면 '기타' + 원문 */
export function splitRacketBrand(stored: string | null | undefined): {
    choice: RacketBrandChoice | undefined
    otherText: string
} {
    if (!stored) return { choice: undefined, otherText: '' }
    const preset = RACKET_BRAND_OPTIONS.find((o) => o.value !== 'other' && o.label === stored)
    return preset ? { choice: preset.value, otherText: '' } : { choice: 'other', otherText: stored }
}

/** 라켓명(모델) 입력 정규화 — trim·길이 제한, 빈 값은 null */
export function normalizeRacketModel(text: string | null | undefined): string | null {
    const trimmed = (text ?? '').trim().slice(0, RACKET_MODEL_MAX_LEN)
    return trimmed.length > 0 ? trimmed : null
}

/** 표시용: '윌슨 · 프로스태프 97' / '윌슨' / '미입력' */
export function formatRacket(brand: string | null | undefined, model: string | null | undefined): string {
    if (!brand && !model) return '미입력'
    return [brand, model].filter(Boolean).join(' · ')
}

/**
 * 표시용 손잡이 라벨 — 값이 없거나 모르는 값이면 undefined(항목을 통째로 빼라는 뜻).
 * HAND_OPTIONS가 정본이므로 라벨을 여기서 파생한다.
 */
export function formatDominantHand(v: string | null | undefined): string | undefined {
    return HAND_OPTIONS.find((o) => o.value === v)?.label
}

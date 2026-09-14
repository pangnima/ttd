// 휴대폰 번호 포맷·정규화·검증 (순수 함수).
//
// 저장 정규형은 **하이픈 포함 형식**이다(`010-1234-5678`). 숫자만 남기지 않는 이유는
// 기존 데이터가 전부 하이픈 형식이고, 숫자 저장으로 옮기면 backfill과 phone을 그대로 그리는
// 모든 화면, `mapUserRow`의 `phone ?? ''` 계약이 함께 움직이기 때문이다.
// 정규형이 하나로 정해져 있으면 나중에 중복 검사를 붙일 때도 그대로 쓸 수 있다.
//
// ⚠ 이 파일의 `MOBILE_PATTERN`은 DB 제약 `users_phone_check`(0079)의 **거울**이다.
//    한쪽만 고치면 화면이 통과시킨 값을 DB가 거부한다 — 반드시 함께 고친다.

/**
 * 허용하는 번호 — 휴대폰만.
 * `010`은 뒷자리가 언제나 4-4이고, 010 통합 이전 식별번호(011·016·017·018·019)만 3-4를 허용한다.
 * 앞자리를 나열하는 것이 요점이다: `\d{3}-\d{4}-\d{4}`였다면 `399-2039-3030`처럼
 * 모양만 맞고 한국에 없는 번호가 통과한다.
 */
const MOBILE_PATTERN = /^(010-\d{4}|01[16789]-\d{3,4})-\d{4}$/

/**
 * 입력 중 자동 하이픈 — 숫자만 추출해 휴대폰 형식으로 끼워 넣는다.
 * 010은 3-4-4, 그 밖의 식별번호는 10자리면 3-3-4·11자리면 3-4-4다.
 * (가운데 자리를 011에서도 4로 고정하면 `011-1234-567` 같은 없는 형태가 만들어진다.)
 * 검증이 아니라 표시용이므로 미완성 입력도 그대로 돌려준다.
 */
export function formatPhoneNumber(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length < 4) return digits

    const midLen = digits.startsWith('010') || digits.length > 10 ? 4 : 3
    if (digits.length <= 3 + midLen) return `${digits.slice(0, 3)}-${digits.slice(3)}`
    return `${digits.slice(0, 3)}-${digits.slice(3, 3 + midLen)}-${digits.slice(3 + midLen)}`
}

/** 폼이 미리 채워 두는 접두어 — 휴대폰만 받으므로 첫 세 자리는 물을 것이 없다. */
export const PHONE_PREFIX = '010-'

/**
 * 입력하지 않은 것으로 볼 값인가.
 *
 * 폼이 `010-`을 미리 채워 두므로 **손대지 않은 칸에도 숫자 세 자리가 들어 있다.**
 * 그것을 "입력했다"로 보면 연락처를 적지 않은 사람이 형식 오류에 막힌다 —
 * 선택 입력이라는 약속이 깨진다. 그래서 접두어만 남은 값도 빈 값으로 친다.
 * (숫자 세 자리짜리 휴대폰 번호는 없으므로 진짜 입력을 잘못 삼킬 일은 없다.)
 */
export function isBlankPhone(value: string | null | undefined): boolean {
    const digits = (value ?? '').replace(/\D/g, '')
    return digits.length === 0 || digits === '010'
}

/** 저장·비교용 정규형. 빈 값·null은 빈 문자열(서버에서 null로 바꾸는 경계 값). */
export function normalizePhone(value: string | null | undefined): string {
    if (!value) return ''
    return formatPhoneNumber(value)
}

/**
 * 저장해도 되는 휴대폰 번호인가. 빈 값은 '선택 입력'이라 여기서 판정하지 않는다(호출부가 먼저 거른다).
 * 자릿수 초과를 먼저 보는 이유는 `formatPhoneNumber`가 11자리에서 잘라 버려,
 * 붙여넣은 긴 숫자가 조용히 유효한 번호로 둔갑하기 때문이다.
 */
export function isValidMobilePhone(value: string | null | undefined): boolean {
    if (!value) return false
    if (value.replace(/\D/g, '').length > 11) return false
    return MOBILE_PATTERN.test(normalizePhone(value))
}

export const PHONE_INVALID_MESSAGE = '휴대폰 번호 형식이 올바르지 않습니다. (예: 010-1234-5678)'

/**
 * 이름·닉네임·휴대폰 입력 검증 — **가입 폼과 프로필 설정이 같은 것을 본다**(순수 함수).
 *
 * 두 액션이 각자 검사하면 규칙이 갈린다. 특히 닉네임은 프로필 설정에서 수정 가능하므로,
 * 가입에만 검증을 넣으면 가입 후 프로필에서 남의 닉네임으로 바꾸는 우회로가 남는다.
 *
 * 여기서 유일성은 보지 않는다 — 순수 함수라 DB를 모른다. 유일성의 권위는
 * 0079의 `users_nickname_unique_idx`이고, 화면·서버의 사전 확인은 0080의 `is_nickname_taken`이다.
 */
import { isValidMobilePhone, normalizePhone, PHONE_INVALID_MESSAGE } from '@/lib/format/phone'
import { normalizeNickname, validateNickname } from '@/lib/profile/nickname'
import { validateName } from '@/lib/profile/signup-fields'

export type IdentityInput = {
    /** 가입에서만 넘어온다 — 프로필 설정에서 이름은 변경 불가라 폼에 필드가 없다 */
    name?: FormDataEntryValue | string | null
    nickname: FormDataEntryValue | string | null
    phone: FormDataEntryValue | string | null
}

export type IdentityValues = {
    name: string
    nickname: string
    /** 정규형(`010-1234-5678`). 미입력이면 빈 문자열 — 저장 경계에서 null로 바꾼다 */
    phone: string
}

export type IdentityCheck =
    | { ok: false; error: string }
    | { ok: true; values: IdentityValues }

const asText = (v: FormDataEntryValue | string | null | undefined): string =>
    typeof v === 'string' ? v : ''

/**
 * 저장 전 검증 + 정규화를 한 번에. 실패하면 화면에 그대로 쓸 한국어 문구를 돌려준다.
 * 정규화까지 여기서 하는 이유는 "검증한 값"과 "저장한 값"이 달라지는 사고를 막기 위해서다.
 */
export function checkIdentityFields(input: IdentityInput): IdentityCheck {
    const name = asText(input.name).trim()
    const nickname = normalizeNickname(asText(input.nickname))
    const phone = normalizePhone(asText(input.phone))

    if (input.name !== undefined) {
        const nameError = validateName(name)
        if (nameError) return { ok: false, error: nameError }
    }

    const nicknameError = validateNickname(nickname)
    if (nicknameError) return { ok: false, error: nicknameError }

    // 휴대폰은 선택 입력이다 — 비어 있으면 통과시키고, 적었으면 형식을 본다.
    if (phone.length > 0 && !isValidMobilePhone(phone)) {
        return { ok: false, error: PHONE_INVALID_MESSAGE }
    }

    return { ok: true, values: { name, nickname, phone } }
}

/** 0079 인덱스 이름 — 23505를 한국어로 옮길 때 어느 제약인지 가려낸다 */
export const NICKNAME_UNIQUE_INDEX = 'users_nickname_unique_idx'

/** DB가 돌려준 에러가 닉네임 중복인가(동시 제출이 화면 검사를 통과해 인덱스에서 걸린 경우) */
export function isNicknameConflict(error: { code?: string; message?: string } | null): boolean {
    if (!error) return false
    return error.code === '23505' && (error.message ?? '').includes(NICKNAME_UNIQUE_INDEX)
}

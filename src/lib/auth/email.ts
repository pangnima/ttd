// 이메일 정규화·형태 판정 (순수 함수).
//
// 여기서 하는 것은 **형식이 그럴듯한가**까지다. 진짜 유효성은 확인 메일이 도착하는지로만 알 수 있고,
// 정규식으로 RFC를 흉내 내면 정상 주소를 막는 쪽의 실수가 더 잦다.
// 그래서 판정은 느슨하게 두고, 화면에서 **중복 조회를 보낼 만한 값인지** 가리는 데만 쓴다.

/** 저장·비교용 정규형 — Supabase가 이메일을 소문자로 다루므로 맞춘다. */
export function normalizeEmail(value: string | null | undefined): string {
    return (value ?? '').trim().toLowerCase()
}

/** `a@b.c` 꼴인가. 공백이 없고 @ 하나, 점이 있는 도메인이면 통과시킨다. */
export function looksLikeEmail(value: string | null | undefined): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value))
}

export const EMAIL_TAKEN_MESSAGE = '이미 가입된 이메일입니다.'

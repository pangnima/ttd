// 연락처 입력 자동 하이픈 포맷터.
// 숫자만 추출한 뒤 한국 휴대폰 형식(010-0000-0000)으로 변환한다.
// 02 지역번호 등은 다루지 않고 휴대폰(11자리) 기준으로 단순화한다.
export function formatPhoneNumber(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11)

    if (digits.length < 4) return digits
    if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

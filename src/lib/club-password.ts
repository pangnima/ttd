// 클럽 삭제(해체) 비밀번호 해시 유틸 (서버 전용).
// 외부 의존성 없이 내장 node:crypto의 scrypt(KDF)로 해시하고, 비교는 timingSafeEqual로 한다.
// 저장 형식: "salt:hash" (둘 다 hex)

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const KEY_LEN = 64

// 평문 → "salt:hash" 문자열
export function hashClubPassword(plain: string): string {
    const salt = randomBytes(16).toString('hex')
    const hash = scryptSync(plain, salt, KEY_LEN).toString('hex')
    return `${salt}:${hash}`
}

// 평문이 저장된 해시와 일치하는지 검증
export function verifyClubPassword(plain: string, stored: string): boolean {
    const [salt, hash] = stored.split(':')
    if (!salt || !hash) return false

    const expected = Buffer.from(hash, 'hex')
    const actual = scryptSync(plain, salt, KEY_LEN)
    // 길이가 다르면 timingSafeEqual이 throw하므로 먼저 차단
    if (expected.length !== actual.length) return false
    return timingSafeEqual(expected, actual)
}

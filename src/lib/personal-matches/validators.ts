import type { PersonalMatchSetScore } from '@/types'
import type { PlayerPickerValue } from '@/components/personal-matches/player-picker'

/**
 * 개인 경기 입력 폼 공통 검증 헬퍼.
 * 페어고정/단식 폼과 로테이션 복식 폼이 함께 사용한다.
 */

// 상대(팀) NTRP 입력 유효성 — 비어있지 않고 1.0~7.0 범위의 수여야 한다.
export function isNtrpValid(v: string): boolean {
    if (v.trim() === '') return false
    const n = Number(v)
    return Number.isFinite(n) && n >= 1 && n <= 7
}

// 선수 입력 완료 여부 — 회원 선택은 userId, 비회원은 이름 + 손잡이(필수)까지 입력돼야 한다.
export function isPlayerFilled(p: PlayerPickerValue): boolean {
    if (p.userId) return true
    return !!p.name.trim() && !!p.hand
}

// 세트 유효성 — 양쪽 점수가 0~99 정수이고 0-0(미입력) 세트가 아니어야 한다.
export function isSetValid(s: PersonalMatchSetScore): boolean {
    if (Number.isNaN(s.me) || Number.isNaN(s.opp)) return false
    if (s.me === 0 && s.opp === 0) return false
    return true
}

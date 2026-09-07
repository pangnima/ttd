import type { OpponentCandidate } from '@/lib/queries/users'
import type { PlayerPickerValue } from '@/components/personal-matches/player-picker'
import { isPlatformMember } from './confirm-flow'

/**
 * 선수 슬롯의 NTRP 규칙 (순수 모듈 — DB 접근 없음).
 *
 * 회원 슬롯의 NTRP는 사용자가 정하는 값이 아니라 그 회원의 프로필에서 파생된 값이다.
 * 서버도 같은 규칙으로 덮어쓴다 — accept_match_request(derive_public_ntrp)·
 * finalize_rotation_session(resolve_rotation_player). 그래서 폼은 값을 보여주되 편집시키지 않는다.
 */

/** 후보의 공개 NTRP 산출 — DB `derive_public_ntrp`(0038)와 동일 규칙 */
export function derivePublicNtrp(
    c: Pick<OpponentCandidate, 'ntrp' | 'personalNtrp' | 'statsHidden'>,
): number | undefined {
    // 통계 비공개 회원은 동적 개인 NTRP를 감추고 자가선언 값만 쓴다
    const v = c.statsHidden ? c.ntrp : c.personalNtrp ?? c.ntrp
    if (v == null || !Number.isFinite(v) || v < 1 || v > 7) return undefined
    return v
}

/**
 * NTRP 입력란 잠금(읽기 전용) 여부 — 플랫폼 회원 슬롯이면서 값이 채워져 있을 때만.
 *
 * 값을 못 가져온 회원(구 데이터로 ntrp가 비어 있는 계정 등)은 잠그지 않고 입력을 받는다.
 * 자유 기록 경로는 서버 검증(validatePersonalMatchInput)이 NTRP를 면제하지 않으므로,
 * 이 폴백이 "클라는 통과, 서버는 거부"가 되는 어긋남을 막는다.
 */
export function isNtrpLocked(
    p: PlayerPickerValue, ntrp: string, candidates: OpponentCandidate[],
): boolean {
    return isPlatformMember(p, candidates) && ntrp.trim() !== ''
}

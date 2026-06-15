import { PROVISIONAL_THRESHOLD } from './constants'

// 클럽 레이팅 표시용 포맷 (소수점 3자리). docs/rating-system.md §5.
export function formatClubRating(rating: number): string {
    return rating.toFixed(3)
}

// 잠정기 여부 (확정 경기 수가 임계 미만이면 아직 정착되지 않은 레이팅).
export function isProvisional(matchesPlayed: number): boolean {
    return matchesPlayed < PROVISIONAL_THRESHOLD
}

/**
 * 표시/분석에 쓸 유효 NTRP — 개인경기 기반 진화값(personalNtrp)이 있으면 그것을, 없으면 가입 시드(ntrp)를 쓴다.
 * 0/미설정(게스트)은 시드 그대로 반환.
 */
export function effectiveNtrp(u: { ntrp: number; personalNtrp?: number }): number {
    return u.personalNtrp != null && u.personalNtrp > 0 ? u.personalNtrp : u.ntrp
}

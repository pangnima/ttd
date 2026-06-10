import { PROVISIONAL_THRESHOLD } from './constants'

// 클럽 레이팅 표시용 포맷 (소수점 3자리). docs/rating-system.md §5.
export function formatClubRating(rating: number): string {
    return rating.toFixed(3)
}

// 잠정기 여부 (확정 경기 수가 임계 미만이면 아직 정착되지 않은 레이팅).
export function isProvisional(matchesPlayed: number): boolean {
    return matchesPlayed < PROVISIONAL_THRESHOLD
}

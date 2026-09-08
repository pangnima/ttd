import type { RotationSession } from '@/types'
import type { EnteredRotationGame } from '@/lib/personal-matches/rotation-entered'

/**
 * 입력 가능한 로테이션 일정 카드를 개인 경기 결과 목록에서 **언제 숨기는가** (Week 38, 순수).
 *
 * 좌석 있는 세션은 finalize 후에도 남는다(0057 — 참가자가 게임을 더 넣을 수 있게). 그러나 게임이
 * 전부 확정되고 경기 날짜까지 지났으면 더 넣을 게임이 없는 것이 보통이라, 그때부터 카드를 숨긴다.
 * 주최자는 그 전에도 [삭제]로 닫을 수 있고, 숨겨진 뒤에도 세션 행은 남아 있어 방 세션은 룸 빌더에서 계속 열 수 있다.
 *
 * '전부 확정'은 내 시야로 판정한다 — 내가 가진 미확정 행이 없고(hasPendingRow), 수락 대기 게임도 없다.
 * 남이 넣었고 내가 좌석이 아닌 게임은 내 확인 대상이 아니므로 세지 않는다.
 */
export function isDormantSession(
    s: Pick<RotationSession, 'playedAt'>,
    games: EnteredRotationGame[],
    hasPendingRow: boolean,
    today: string,
): boolean {
    if (games.length === 0) return false
    if (hasPendingRow || games.some((g) => g.awaitingConsent)) return false
    return s.playedAt < today
}

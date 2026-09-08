import type { PersonalMatchConfirmation } from '@/types'
import { hasDisputeHistory, reentryBadge } from '@/lib/personal-matches/confirmation'

type Props = {
    confirmation?: PersonalMatchConfirmation
    /** 이의 제기자 표시 이름(disputerNameOf) — 좌석 만드는 방식이 화면마다 달라 호출부가 계산해 넘긴다 */
    disputerName?: string
    /** 호출부의 대기 배지 클래스 — DisputedResultActions의 badgeClassName과 같은 규약 */
    badgeClassName: string
}

/**
 * 이의를 거친 뒤 다시 제안된 결과에 붙는 맥락 배지 (0062) — '내 이의 후 재입력' 등.
 *
 * 개인 경기 카드(MutualResultActions)와 룸 게임 행(RoomGameActions)이 공용한다. 두 화면의 proposed 분기가
 * 동형이라 인라인으로 두면 판정이 복제된다. 이의 이력이 없으면 스스로 사라지므로 호출부에 조건문을 두지 않는다.
 */
export function ReentryContextBadge({ confirmation, disputerName, badgeClassName }: Props) {
    if (!confirmation || !hasDisputeHistory(confirmation)) return null
    const badge = reentryBadge(confirmation, disputerName)
    return <span className={badgeClassName} title={badge.title}>{badge.label}</span>
}

import type { MatchQueue } from '@/lib/queries/match-queue'
import { disputeMyTurnTotal } from '@/lib/match-requests/queue'
import { EMPTY_BLOCK } from '@/lib/dashboard/tokens'
import { PendingMatchSection } from '@/components/match-requests/pending-match-section'

type Props = { queue: MatchQueue }

/**
 * 확인 요청 허브 「승인 요청 › 이의 신청」 — 이의 뒤에 **내가 할 일**만 담는다.
 *
 * 0061·0062의 「이의 처리」 탭은 이의를 거친 협상의 생애 전체(대기 포함)를 한 탭에 모았다.
 * Week 38부터 탭은 차례 축을 따른다 — 대기(재입력 대기·재입력 결과 확인 대기)는 「상대 승인 대기」로 갔고,
 * 이의자가 자기 분쟁을 추적하는 수단은 카드의 배지(ReentryContextBadge·DisputeReasonLine)다.
 * 그래서 이 탭은 카드 수 = 내 차례이고 두 섹션 모두 '승인 필요'다.
 */
export function DisputePanel({ queue }: Props) {
    if (disputeMyTurnTotal(queue.counts) === 0) {
        return <div className={EMPTY_BLOCK}>처리할 이의가 없습니다.</div>
    }

    const review = queue.pendingMatches.filter((p) => p.bucket === 'reentryReview')
    const reenter = queue.pendingMatches.filter((p) => p.bucket === 'reenterResult')

    return (
        <>
            <PendingMatchSection
                title="재입력된 결과 확인"
                hint="이의 후 다시 입력된 결과입니다 — 사유가 반영됐는지 확인하고 승인해주세요"
                entries={review}
                attention
            />
            <PendingMatchSection
                title="다시 입력할 차례"
                hint="내 제안에 이의가 들어왔습니다 — 사유를 확인하고 다시 입력하면 회원 참가자 전원에게 확인을 다시 요청합니다"
                entries={reenter}
                attention
            />
        </>
    )
}

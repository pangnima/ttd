import type { MatchQueue } from '@/lib/queries/match-queue'
import { disputeTotal } from '@/lib/match-requests/queue'
import { EMPTY_BLOCK } from '@/lib/dashboard/tokens'
import { PendingMatchSection } from '@/components/match-requests/pending-match-section'

type Props = { queue: MatchQueue }

/**
 * 확인 요청 허브 「이의 처리」 탭 (0061, 0062) — 이의(또는 정정)를 거친 협상의 **생애 전체**를 담는다.
 * 다른 두 탭에는 나오지 않는다(3탭 상호배타).
 *
 * 0062 이전에는 disputed 상태만 담아, 제안자가 다시 입력하는 순간 그 경기가 이 탭에서 사라지고
 * 「내 차례 · 결과 확인 대기」로 조용히 옮겨갔다 — 이의를 낸 사람은 자기가 시작한 분쟁의 결말을
 * 추적할 수 없었다. 이제 확정될 때까지 여기 머물고, 재입력된 결과도 이 화면에서 확인·승인한다.
 *
 * 섹션은 **내 차례를 위에** 둔다. QueueSection이 count 0이면 렌더하지 않아 빈 섹션은 알아서 사라진다.
 */
export function DisputedPanel({ queue }: Props) {
    if (disputeTotal(queue.counts) === 0) {
        return <div className={EMPTY_BLOCK}>이의가 제기된 경기가 없습니다.</div>
    }

    const review = queue.pendingMatches.filter((p) => p.bucket === 'reentryReview')
    const reenter = queue.pendingMatches.filter((p) => p.bucket === 'reenterResult')
    const waiting = queue.pendingMatches.filter((p) => p.bucket === 'awaitingReentry')
    const reviewed = queue.pendingMatches.filter((p) => p.bucket === 'awaitingReentryConfirm')
    // 내가 낸 이의 / 다른 참가자 사이의 이의(비좌석 폴백 포함)
    const mine = waiting.filter((p) => p.match.confirmation?.disputedByMe)
    const others = waiting.filter((p) => !p.match.confirmation?.disputedByMe)

    return (
        <>
            <PendingMatchSection
                title="재입력된 결과 확인"
                hint="이의 후 다시 입력된 결과입니다 — 사유가 반영됐는지 확인하고 승인해주세요"
                entries={review}
            />
            <PendingMatchSection
                title="다시 입력할 차례"
                hint="내 제안에 이의가 들어왔습니다 — 사유를 확인하고 다시 입력하면 회원 참가자 전원에게 확인을 다시 요청합니다"
                entries={reenter}
            />
            <PendingMatchSection
                title="내가 이의 제기함"
                hint="내 이의는 전달됐습니다 — 다시 입력되면 이 탭에서 바로 확인할 수 있습니다. 급하면 직접 다시 입력할 수도 있습니다"
                entries={mine}
            />
            <PendingMatchSection
                title="이의 진행 중"
                hint="다른 참가자가 이의를 제기했습니다 — 제안자의 재입력을 기다립니다. 결과를 아는 참가자는 직접 다시 입력할 수도 있습니다"
                entries={others}
            />
            <PendingMatchSection
                title="재입력 결과 확인 대기"
                hint="다시 입력한 결과를 남은 회원 참가자가 확인하는 중입니다 — 전원이 확인하면 확정됩니다"
                entries={reviewed}
            />
        </>
    )
}

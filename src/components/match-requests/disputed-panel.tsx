import type { MatchQueue } from '@/lib/queries/match-queue'
import { disputeTotal } from '@/lib/match-requests/queue'
import { EMPTY_BLOCK } from '@/lib/dashboard/tokens'
import { PendingMatchSection } from '@/components/match-requests/pending-match-section'

type Props = { queue: MatchQueue }

/**
 * 확인 요청 허브 「이의 제기」 탭 (0061) — 제안된 결과에 이의(또는 정정)가 들어와 disputed로 돌아온 경기 전량.
 * 다른 두 탭에는 나오지 않는다(3탭 상호배타). 다시 입력할 차례는 **제안자**뿐이고(isReentryTurn) 그 건수만
 * 사이드바 뱃지·탭 배지에 센다. 이의자와 나머지 좌석은 기다리되, 재제안 RPC가 좌석 누구나 허용하므로
 * [다시 입력] 버튼은 outline으로 남아 있다.
 */
export function DisputedPanel({ queue }: Props) {
    if (disputeTotal(queue.counts) === 0) {
        return <div className={EMPTY_BLOCK}>이의가 제기된 경기가 없습니다.</div>
    }

    const reenter = queue.pendingMatches.filter((p) => p.bucket === 'reenterResult')
    const waiting = queue.pendingMatches.filter((p) => p.bucket === 'awaitingReentry')
    // 내가 낸 이의 / 다른 참가자 사이의 이의(비좌석 폴백 포함)
    const mine = waiting.filter((p) => p.match.confirmation?.disputedByMe)
    const others = waiting.filter((p) => !p.match.confirmation?.disputedByMe)

    return (
        <>
            <PendingMatchSection
                title="다시 입력할 차례"
                hint="내 제안에 이의가 들어왔습니다 — 사유를 확인하고 다시 입력하면 회원 참가자 전원에게 확인을 다시 요청합니다"
                entries={reenter}
            />
            <PendingMatchSection
                title="내가 이의 제기함"
                hint="내 이의는 전달됐습니다 — 제안자가 다시 입력하면 확인 요청이 옵니다. 급하면 직접 다시 입력할 수도 있습니다"
                entries={mine}
            />
            <PendingMatchSection
                title="이의 진행 중"
                hint="다른 참가자가 이의를 제기했습니다 — 제안자의 재입력을 기다립니다. 결과를 아는 참가자는 직접 다시 입력할 수도 있습니다"
                entries={others}
            />
        </>
    )
}

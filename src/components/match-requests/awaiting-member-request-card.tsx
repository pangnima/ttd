import type { MatchRequestWithUser } from '@/lib/queries/match-requests'
import { invertSetScores } from '@/lib/personal-matches/perspective'
import { viewerSideOf } from '@/lib/match-requests/participants'
import { RequestMatchSummary } from '@/components/match-requests/request-match-summary'
import { RequestTeamLine } from '@/components/match-requests/request-team-line'
import {
    AcceptanceProgressBadge, AwaitingMembersNote,
} from '@/components/match-requests/request-acceptance-note'

type Props = { item: MatchRequestWithUser }

/**
 * 내 응답은 끝났고 남은 회원의 수락을 기다리는 요청 카드(0056).
 * 취소 버튼이 없다 — 참가자에게는 취소 권한이 없고(요청자 전용), 요청자는 「상대 수락 대기」로 간다.
 */
export function AwaitingMemberRequestCard({ item }: Props) {
    const { request, counterpart } = item
    const onRequesterSide = viewerSideOf(request.viewerRole) === 'requester'

    return (
        <div className="px-4 py-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-body2 font-medium text-foreground truncate">
                        <span className="text-muted-foreground">vs </span>{counterpart.name}
                    </p>
                    <RequestTeamLine
                        request={request}
                        counterpartName={counterpart.name}
                        viewerIsRequester={onRequesterSide}
                    />
                </div>
                <AcceptanceProgressBadge request={request} />
            </div>
            <RequestMatchSummary
                playedAt={request.playedAt}
                playedTime={request.playedTime}
                surface={request.surface}
                courtName={request.courtName}
                sets={onRequesterSide ? request.setScores : invertSetScores(request.setScores)}
            />
            <AwaitingMembersNote request={request} />
        </div>
    )
}

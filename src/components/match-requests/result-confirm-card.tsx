'use client'

import { Button } from '@/components/ui/button'
import type { MatchRequestWithUser } from '@/lib/queries/match-requests'
import { confirmMatchResultAction, disputeMatchResultAction } from '@/lib/actions/match-results'
import { invertSetScores } from '@/lib/personal-matches/perspective'
import { RequestMatchSummary } from '@/components/match-requests/request-match-summary'
import { RequestTeamLine } from '@/components/match-requests/request-team-line'
import { MatchResultDialog } from '@/components/personal-matches/match-result-dialog'
import { useResultDialog } from '@/components/personal-matches/use-result-dialog'

type Props = {
    item: MatchRequestWithUser
    viewerId: string
}

/**
 * 확인 요청 허브의 '결과 확인 대기' 카드 — 상대가 제안한 세트를 내 관점으로 보여주고 확인/이의 Dialog를 연다.
 * 제안 세트는 요청자 관점으로 저장되므로 내가 상대(opponent)면 반전한다.
 */
export function ResultConfirmCard({ item, viewerId }: Props) {
    const { request, counterpart } = item
    const d = useResultDialog()
    const mySets = request.requesterId === viewerId
        ? request.proposedSetScores
        : invertSetScores(request.proposedSetScores)

    return (
        <div className="px-4 py-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-body2 font-medium text-foreground truncate">
                        {counterpart.name}
                        {counterpart.deleted && <span className="ml-1 text-caption text-muted-foreground">(탈퇴)</span>}
                    </p>
                    {counterpart.nickname && (
                        <p className="text-caption text-muted-foreground truncate">{counterpart.nickname}</p>
                    )}
                    <RequestTeamLine request={request} counterpartName={counterpart.name} viewerIsRequester={request.requesterId === viewerId} />
                </div>
                <Button size="sm" className="h-7 text-caption shrink-0" onClick={d.openDialog}>
                    결과 확인
                </Button>
            </div>
            <RequestMatchSummary
                playedAt={request.playedAt}
                playedTime={request.playedTime}
                surface={request.surface}
                sets={mySets}
            />
            <p className="text-caption text-muted-foreground break-keep">
                상대가 제안한 결과입니다. 확인하면 양쪽 기록에 확정되고, 다르면 이의를 제기할 수 있습니다.
            </p>

            <MatchResultDialog
                mode="review"
                open={d.open}
                onOpenChange={d.setOpen}
                opponentName={counterpart.name}
                title="경기 결과 확인"
                proposedSets={mySets}
                onConfirm={() => d.run(() => confirmMatchResultAction(request.id))}
                onDispute={(reason) => d.run(() => disputeMatchResultAction(request.id, reason))}
                isPending={d.isPending}
                error={d.error}
            />
        </div>
    )
}

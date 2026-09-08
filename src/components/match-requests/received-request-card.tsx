'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import type { MatchRequestWithUser } from '@/lib/queries/match-requests'
import {
    acceptMatchRequestAction, rejectMatchRequestAction, respondRequestParticipationAction,
} from '@/lib/actions/match-requests'
import { invertSetScores } from '@/lib/personal-matches/perspective'
import { viewerSideOf } from '@/lib/match-requests/participants'
import { RequestMatchSummary } from '@/components/match-requests/request-match-summary'
import { RequestStatusBadge } from '@/components/match-requests/request-status-badge'
import { RequestTeamLine } from '@/components/match-requests/request-team-line'
import {
    AcceptanceNote, AcceptanceProgressBadge, RequestAcceptanceStatusLine,
} from '@/components/match-requests/request-acceptance-note'

type Props = { item: MatchRequestWithUser }

/**
 * 받은 확인 요청 카드 — 대표(opponent)와 회원 참가자(파트너·상대2)가 함께 쓴다(0056).
 * 스코어·팀 라인은 요청자 관점으로 저장되므로 내가 앉은 팀 기준으로 뒤집는다 —
 * 파트너 뷰어에게까지 반전을 걸면 자기 팀이 상대팀으로 보인다.
 */
export function ReceivedRequestCard({ item }: Props) {
    const { request, counterpart } = item
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    const onRequesterSide = viewerSideOf(request.viewerRole) === 'requester'
    // 대표는 전용 RPC(수락 = opponent 축), 참가자는 좌석 응답 RPC
    const isRep = request.viewerRole === 'opponent'
    const sets = onRequesterSide ? request.setScores : invertSetScores(request.setScores)

    const run = (action: () => Promise<{ error: string | null }>) =>
        startTransition(async () => {
            setError(null)
            const result = await action()
            if (result.error) setError(result.error)
        })

    const accept = () => run(() => (isRep
        ? acceptMatchRequestAction(request.id)
        : respondRequestParticipationAction(request.id, true)))
    const reject = () => run(() => rejectMatchRequestAction(request.id))

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
                    <RequestTeamLine
                        request={request}
                        counterpartName={counterpart.name}
                        viewerIsRequester={onRequesterSide}
                    />
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <AcceptanceProgressBadge request={request} />
                    {request.status === 'pending' ? (
                        <>
                            {!counterpart.deleted && (
                                <Button size="sm" className="h-7 text-caption" disabled={isPending} onClick={accept}>
                                    수락
                                </Button>
                            )}
                            <Button size="sm" variant="outline" className="h-7 text-caption" disabled={isPending} onClick={reject}>
                                거절
                            </Button>
                        </>
                    ) : (
                        <RequestStatusBadge status={request.status} />
                    )}
                </div>
            </div>
            <RequestMatchSummary
                playedAt={request.playedAt}
                playedTime={request.playedTime}
                surface={request.surface}
                courtName={request.courtName}
                sets={sets}
            />
            {request.status === 'pending' && <RequestAcceptanceStatusLine request={request} />}
            {request.status === 'pending' && <AcceptanceNote request={request} />}
            {error && <p className="text-caption text-destructive">{error}</p>}
        </div>
    )
}

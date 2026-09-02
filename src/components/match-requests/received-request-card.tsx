'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import type { MatchRequestWithUser } from '@/lib/queries/match-requests'
import { acceptMatchRequestAction, rejectMatchRequestAction } from '@/lib/actions/match-requests'
import { invertSetScores } from '@/lib/personal-matches/perspective'
import { RequestMatchSummary } from '@/components/match-requests/request-match-summary'
import { RequestStatusBadge } from '@/components/match-requests/request-status-badge'
import { RequestTeamLine } from '@/components/match-requests/request-team-line'

type Props = { item: MatchRequestWithUser }

/** 받은 확인 요청 카드 — 스코어는 요청자 관점으로 저장되므로 내 관점으로 반전해 보여준다 */
export function ReceivedRequestCard({ item }: Props) {
    const { request, counterpart } = item
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    const handle = (action: (id: string) => Promise<{ error: string | null }>) =>
        startTransition(async () => {
            setError(null)
            const result = await action(request.id)
            if (result.error) setError(result.error)
        })

    return (
        <div className="px-4 py-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                        {counterpart.name}
                        {counterpart.deleted && <span className="ml-1 text-xs text-muted-foreground">(탈퇴)</span>}
                    </p>
                    {counterpart.nickname && (
                        <p className="text-xs text-muted-foreground truncate">{counterpart.nickname}</p>
                    )}
                    <RequestTeamLine request={request} counterpartName={counterpart.name} viewerIsRequester={false} />
                </div>
                {request.status === 'pending' && !counterpart.deleted ? (
                    <div className="flex gap-1.5 shrink-0">
                        <Button size="sm" className="h-7 text-xs" disabled={isPending}
                            onClick={() => handle(acceptMatchRequestAction)}>
                            수락
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" disabled={isPending}
                            onClick={() => handle(rejectMatchRequestAction)}>
                            거절
                        </Button>
                    </div>
                ) : request.status === 'pending' ? (
                    <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" disabled={isPending}
                        onClick={() => handle(rejectMatchRequestAction)}>
                        거절
                    </Button>
                ) : (
                    <RequestStatusBadge status={request.status} />
                )}
            </div>
            <RequestMatchSummary
                playedAt={request.playedAt}
                playedTime={request.playedTime}
                surface={request.surface}
                sets={invertSetScores(request.setScores)}
            />
            {request.status === 'pending' && (
                <p className="text-xs text-muted-foreground break-keep">
                    수락하면 양쪽 기록에 함께 추가되며 이후 수정할 수 없습니다. 결과는 세트 스코어 등록 시 확정됩니다.
                </p>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    )
}

'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import type { MatchRequestWithUser } from '@/lib/queries/match-requests'
import { cancelMatchRequestAction } from '@/lib/actions/match-requests'
import { RequestMatchSummary } from '@/components/match-requests/request-match-summary'
import { RequestStatusBadge } from '@/components/match-requests/request-status-badge'

type Props = { item: MatchRequestWithUser }

/** 보낸 확인 요청 카드 — 스코어는 이미 내(요청자) 관점 */
export function SentRequestCard({ item }: Props) {
    const { request, counterpart } = item
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    const handleCancel = () =>
        startTransition(async () => {
            setError(null)
            const result = await cancelMatchRequestAction(request.id)
            if (result.error) setError(result.error)
        })

    return (
        <div className="px-4 py-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex items-center gap-2">
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                            <span className="text-muted-foreground">vs </span>{counterpart.name}
                            {counterpart.deleted && <span className="ml-1 text-xs text-muted-foreground">(탈퇴)</span>}
                        </p>
                        {counterpart.nickname && (
                            <p className="text-xs text-muted-foreground truncate">{counterpart.nickname}</p>
                        )}
                    </div>
                    <RequestStatusBadge status={request.status} />
                </div>
                {request.status === 'pending' && (
                    <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" disabled={isPending}
                        onClick={handleCancel}>
                        취소
                    </Button>
                )}
            </div>
            <RequestMatchSummary
                playedAt={request.playedAt}
                playedTime={request.playedTime}
                surface={request.surface}
                sets={request.setScores}
            />
            {request.status === 'pending' && (
                <p className="text-xs text-muted-foreground break-keep">
                    내용을 고치려면 취소 후 다시 등록해주세요. 상대가 수락하면 양쪽 전적에 기록됩니다.
                </p>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    )
}

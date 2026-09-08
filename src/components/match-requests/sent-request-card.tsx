'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { MatchRequestWithUser } from '@/lib/queries/match-requests'
import { cancelMatchRequestAction } from '@/lib/actions/match-requests'
import { canReissueAsGuest } from '@/lib/personal-matches/request-prefill'
import { RequestMatchSummary } from '@/components/match-requests/request-match-summary'
import { RequestStatusBadge } from '@/components/match-requests/request-status-badge'
import { RequestTeamLine } from '@/components/match-requests/request-team-line'

type Props = { item: MatchRequestWithUser }

/**
 * 보낸 확인 요청 카드 — 스코어는 이미 내(요청자) 관점.
 *
 * pending에서 요청자가 할 수 있는 것은 [취소]와 [게스트로 바꿔 다시 요청](Week 38)이다.
 * 후자는 응답 없는 회원 좌석 때문에 기록이 영영 안 생기는 상황의 탈출구 — 요청은 불변이라 취소한 뒤
 * 같은 내용을 등록 폼에 프리필하고(`?from=`), 미응답·거절 좌석은 게스트로 바뀐다(request-prefill.ts).
 * 로테이션은 세션 카드의 [게스트로 대체](0064)가 같은 역할을 한다.
 */
export function SentRequestCard({ item }: Props) {
    const { request, counterpart } = item
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    const cancel = (after?: () => void) =>
        startTransition(async () => {
            setError(null)
            const result = await cancelMatchRequestAction(request.id)
            if (result.error) setError(result.error)
            else after?.()
        })

    const pending = request.status === 'pending'
    const reissuable = canReissueAsGuest(request)

    return (
        <div className="px-4 py-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex items-center gap-2">
                    <div className="min-w-0">
                        <p className="text-body2 font-medium text-foreground truncate">
                            <span className="text-muted-foreground">vs </span>{counterpart.name}
                            {counterpart.deleted && <span className="ml-1 text-caption text-muted-foreground">(탈퇴)</span>}
                        </p>
                        {counterpart.nickname && (
                            <p className="text-caption text-muted-foreground truncate">{counterpart.nickname}</p>
                        )}
                        <RequestTeamLine request={request} counterpartName={counterpart.name} viewerIsRequester />
                    </div>
                    <RequestStatusBadge status={request.status} />
                </div>
                {pending && (
                    <span className="flex items-center gap-1.5 shrink-0">
                        {reissuable && (
                            <Button size="sm" variant="outline" className="h-7 text-caption" disabled={isPending}
                                onClick={() => cancel(() => router.push(`/me/personal-matches/new?from=${request.id}`))}>
                                게스트로 바꿔 다시 요청
                            </Button>
                        )}
                        <Button size="sm" variant="outline" className="h-7 text-caption" disabled={isPending}
                            onClick={() => cancel()}>
                            취소
                        </Button>
                    </span>
                )}
            </div>
            <RequestMatchSummary
                playedAt={request.playedAt}
                playedTime={request.playedTime}
                surface={request.surface}
                courtName={request.courtName}
                sets={request.setScores}
            />
            {pending && (
                <p className="text-caption text-muted-foreground break-keep">
                    {reissuable
                        ? '응답이 없는 참가자가 있으면 [게스트로 바꿔 다시 요청]으로 그 사람을 비회원으로 바꿔 다시 등록할 수 있습니다 — 그분의 전적에는 남지 않습니다. 내용을 고치려면 취소 후 다시 등록해주세요.'
                        : '내용을 고치려면 취소 후 다시 등록해주세요. 상대가 수락하면 양쪽 기록에 추가되고, 결과는 게임 스코어 등록 시 확정됩니다.'}
                </p>
            )}
            {error && <p className="text-caption text-destructive">{error}</p>}
        </div>
    )
}

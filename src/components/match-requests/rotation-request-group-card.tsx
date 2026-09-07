'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import type { MatchRequestWithUser } from '@/lib/queries/match-requests'
import { respondRotationParticipationAction } from '@/lib/actions/match-requests'
import { formatHourLabel } from '@/lib/format'
import { SURFACE_LABELS } from '@/lib/dashboard/surface'
import { formatAcceptanceProgress, pendingMemberCount } from '@/lib/match-requests/participants'
import { PILL_BASE } from '@/lib/dashboard/tokens'

type Props = {
    sessionId: string
    items: MatchRequestWithUser[]   // 같은 로테이션 세션에서 파생된 요청들(게임 1건 = 요청 1건)
}

/**
 * 로테이션 세션 단위 참여 확인 카드(0056).
 *
 * 한 세션에서 같은 회원이 게임1에서는 상대 대표, 게임3에서는 내 파트너일 수 있다. 요청별로 카드를 쪼개면
 * 같은 세션에 대해 [수락]을 역할을 바꿔가며 여러 번 누르는 화면이 되므로, 세션을 한 장으로 묶고
 * 일괄 RPC(respond_rotation_participation)로 한 번에 응답한다. 참여 동의의 단위는 본래 게임이 아니라 세션이다.
 */
export function RotationRequestGroupCard({ sessionId, items }: Props) {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    const head = items[0].request
    const when = [head.playedAt.replaceAll('-', '.'), formatHourLabel(head.playedTime)].filter(Boolean).join(' ')
    const tail = ['로테이션', head.courtName, SURFACE_LABELS[head.surface] ?? head.surface].filter(Boolean).join(' · ')
    // 세션 전체에서 아직 응답하지 않은 회원 수 — 게임마다 좌석이 겹치므로 최댓값이 남은 인원의 하한이다
    const remaining = Math.max(...items.map((i) => pendingMemberCount(i.request.seats)))
    const progress = formatAcceptanceProgress(head.seats)

    const run = (accept: boolean) =>
        startTransition(async () => {
            setError(null)
            const result = await respondRotationParticipationAction(sessionId, accept)
            if (result.error) setError(result.error)
        })

    return (
        <div className="px-4 py-3 space-y-2">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-body2 font-medium text-foreground truncate tabular-nums">
                        {when} <span className="font-normal text-muted-foreground">· {tail}</span>
                    </p>
                    <p className="text-caption text-muted-foreground truncate">
                        {items[0].counterpart.name}님이 입력한 게임 {items.length}건
                    </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    {progress && (
                        <span className={`${PILL_BASE} border border-border text-muted-foreground tabular-nums`}>
                            {progress}
                        </span>
                    )}
                    <Button size="sm" className="h-7 text-caption" disabled={isPending} onClick={() => run(true)}>
                        전체 수락
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-caption" disabled={isPending} onClick={() => run(false)}>
                        거절
                    </Button>
                </div>
            </div>

            <ul className="space-y-0.5">
                {items.map(({ request }, i) => (
                    <li key={request.id} className="text-caption text-muted-foreground truncate tabular-nums">
                        게임 {request.groupSeq ?? i + 1} · {gameLine(request)}
                    </li>
                ))}
            </ul>

            <p className="text-caption text-muted-foreground break-keep">
                회원 참가자 전원이 수락해야 모두의 기록에 추가됩니다
                {remaining > 1 && ` (내 응답 외 ${remaining - 1}명 남음)`}. 이후 결과는 게임마다 상대팀 대표가 확인하면 확정됩니다.
            </p>
            {error && <p className="text-caption text-destructive">{error}</p>}
        </div>
    )
}

/** '나·파트너 vs 상대1·상대2' — 좌석에서 뽑는다(요청 행의 평탄화 필드는 요청자 기준이라 관점이 섞인다) */
function gameLine(request: MatchRequestWithUser['request']): string {
    const nameOf = (role: 'requester' | 'opponent' | 'partner' | 'opponent2') =>
        request.seats.find((s) => s.role === role)?.name || '?'
    return `${nameOf('requester')} · ${nameOf('partner')} vs ${nameOf('opponent')} · ${nameOf('opponent2')}`
}

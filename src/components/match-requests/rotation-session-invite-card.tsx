'use client'

import { useState, useTransition } from 'react'
import type { RotationSession } from '@/types'
import { Button } from '@/components/ui/button'
import { respondRotationPlanAction } from '@/lib/actions/rotation-sessions'
import { pendingMemberCount } from '@/lib/match-requests/participants'
import { PENDING_RESULT_BAR } from '@/lib/dashboard/outcome'
import { MatchDateColumn } from '@/components/personal-matches/match-date-column'
import { MatchMetaLine } from '@/components/personal-matches/match-meta-line'
import { SeatProgressBadge, SessionPlanNote } from '@/components/match-requests/request-acceptance-note'
import { SeatAcceptanceStatusLine } from '@/components/match-requests/seat-acceptance-status-line'

type Props = {
    session: RotationSession
    viewerId: string
    /** 「상대 대기」 탭 — 이미 수락해서 버튼 없이 진행도만 보여준다 */
    readOnly?: boolean
}

/**
 * 로테이션 **일정** 초대 카드 (0057) — 아직 게임이 하나도 없는 단계다.
 * 종전에는 세션 등록이 풀 회원에게 아무 통지도 하지 않아, 같은 시간에 함께 치는 사람들이
 * 서로 모른 채 같은 일정을 중복 생성했다. 이 카드가 그 지점을 메운다.
 */
export function RotationSessionInviteCard({ session: s, viewerId, readOnly = false }: Props) {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    const respond = (accept: boolean) =>
        startTransition(async () => {
            setError(null)
            const res = await respondRotationPlanAction(s.id, accept)
            if (res.error) setError(res.error)
        })

    // players에는 소유자가 없다('나 제외'로 저장된다) — 명단은 주최자를 앞세우고 나를 뺀다
    const ownerName = s.owner?.name ?? '주최자'
    const others = s.players.filter((p) => p.userId !== viewerId).map((p) => p.name)

    return (
        <div className="flex items-stretch gap-3 px-3 py-3">
            <span className={`w-1 self-stretch rounded-full ${PENDING_RESULT_BAR}`} aria-hidden />
            <MatchDateColumn playedAt={s.playedAt} matchType={s.matchType} surface={s.surface} />

            <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-body2 font-medium text-foreground truncate">
                            {ownerName}님의 로테이션 경기
                        </p>
                        <p className="text-caption text-muted-foreground truncate">
                            {[ownerName, ...others].join(' · ')}
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <SeatProgressBadge seats={s.seats} />
                        {!readOnly && (
                            <>
                                <Button size="sm" className="h-7 text-caption" disabled={isPending} onClick={() => respond(true)}>수락</Button>
                                <Button size="sm" variant="outline" className="h-7 text-caption" disabled={isPending} onClick={() => respond(false)}>거절</Button>
                            </>
                        )}
                    </div>
                </div>
                <MatchMetaLine playedTime={s.playedTime} courtName={s.courtName} notes={s.notes} className="space-y-0.5" />
                {/* 명부 줄은 '누가 있는가'만 말한다 — 누가 응답했는지는 좌석 상태가 말한다 */}
                <SeatAcceptanceStatusLine seats={s.seats} />
                <SessionPlanNote readOnly={readOnly} remaining={pendingMemberCount(s.seats)} isOwner={s.userId === viewerId} />
                {error && <p className="text-caption text-destructive">{error}</p>}
            </div>
        </div>
    )
}

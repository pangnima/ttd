'use client'

import { useMemo } from 'react'
import type { RotationSession } from '@/types'
import { Button } from '@/components/ui/button'
import { finalizeRotationSessionAction } from '@/lib/actions/rotation-sessions'
import { buildBuilderPool, type RoomParticipant } from '@/lib/personal-matches/rotation-pool'
import type { PoolPickerProps } from '@/components/personal-matches/rotation/pool-editor-block'
import { RotationGamesDialog } from '@/components/personal-matches/rotation-games-dialog'
import { nextGroupSeq, type EnteredRotationGame } from '@/lib/personal-matches/rotation-entered'
import { useResultDialog } from '@/components/personal-matches/use-result-dialog'

type Props = {
    session: RotationSession
    /** 방 참가자(나 제외) — 빌더 풀은 "세션 풀 ∪ 방 참가자 − 나"(0050) */
    participants: RoomParticipant[]
    viewerId: string
    picker: PoolPickerProps
    /**
     * 이 세션에 이미 등록된 게임 (0064). 방은 참가자 여럿이 각자 넣으므로 중복 위험이 가장 큰 자리다 —
     * 목록을 보여 주고, 그 다음 번호를 선점 값으로 서버에 보낸다.
     */
    enteredGames?: EnteredRotationGame[]
}

/**
 * 미확정 로테이션 방의 룸 안 게임 빌더 — 방에 참가한 회원 누구나 **자기 기준으로** 게임을 넣는다(0050).
 * 상대팀에 회원이 있으면 그 게임도 제안→확인을 거치고, 전원 비회원인 게임만 즉시 확정된다.
 */
export function RoomRotationBuilder({ session, participants, viewerId, picker, enteredGames = [] }: Props) {
    const d = useResultDialog()
    const pool = useMemo(
        () => buildBuilderPool(session.players, participants, viewerId),
        [session.players, participants, viewerId],
    )

    return (
        <>
            <Button variant="ghost" size="sm" className="h-7 text-body2 font-medium text-primary px-0 hover:bg-transparent hover:underline" onClick={d.openDialog}>
                게임 입력
            </Button>
            <RotationGamesDialog
                open={d.open}
                onOpenChange={d.setOpen}
                session={session}
                pool={pool}
                isRoomSession
                picker={picker}
                enteredGames={enteredGames}
                onSubmit={(games) => d.run(() => finalizeRotationSessionAction(session.id, games, nextGroupSeq(enteredGames)))}
                isPending={d.isPending}
                error={d.error}
            />
        </>
    )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PersonalMatch } from '@/types'
import type { RoomGameContext } from '@/lib/match-rooms/room-context'
import type { OpponentCandidate } from '@/lib/queries/users'
import type { PastOpponent } from '@/lib/queries/personal-matches'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PersonalMatchForm } from '@/components/personal-matches/personal-match-form'

type Props = {
    ctx: RoomGameContext
    opponentCandidates: OpponentCandidate[]
    pastOpponents: PastOpponent[]
    selfUserId: string
    /** '참가자 채우기'로 열 때 — 모집 중인 내 seed 기록(치환 경로) */
    initialData?: PersonalMatch
    triggerLabel?: string
}

/**
 * 매칭 룸 안에서 게임을 추가하는 팝업 — 등록 폼을 그대로 띄운다(메타는 방 값으로 고정).
 * 룸을 떠나지 않고 입력을 끝내기 위한 것이므로, 저장·취소 모두 룸에 머문다.
 */
export function RoomGameDialog({
    ctx, opponentCandidates, pastOpponents, selfUserId, initialData, triggerLabel = '+ 게임 추가',
}: Props) {
    const [open, setOpen] = useState(false)
    const router = useRouter()

    return (
        <>
            <Button variant="ghost" size="sm" className="h-7 text-body2 font-medium text-primary px-0 hover:bg-transparent hover:underline" onClick={() => setOpen(true)}>
                {triggerLabel}
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{initialData ? '참가자 채우기' : '게임 추가'}</DialogTitle>
                    </DialogHeader>
                    <PersonalMatchForm
                        variant="dialog"
                        initialData={initialData}
                        opponentCandidates={opponentCandidates}
                        pastOpponents={pastOpponents}
                        selfUserId={selfUserId}
                        roomContext={ctx}
                        nav={{
                            onDone: () => { setOpen(false); router.refresh() },
                            onCancel: () => setOpen(false),
                        }}
                    />
                </DialogContent>
            </Dialog>
        </>
    )
}

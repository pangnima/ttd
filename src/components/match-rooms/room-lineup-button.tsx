'use client'

import { useState } from 'react'
import type { MatchType } from '@/types'
import type { OpponentCandidate } from '@/lib/queries/users'
import { Button } from '@/components/ui/button'
import { RoomLineupDialog } from '@/components/match-rooms/room-lineup-dialog'

type Props = {
    roomId: string
    matchType: MatchType
    /** 참가(joined)한 회원 전원 — 방장 본인 포함 */
    candidates: OpponentCandidate[]
    existingGames: number
}

/**
 * [자동 대진표] — 방장에게만 보인다(중복 생성 사고 방지).
 * 다이얼로그는 열 때 마운트해 참가자가 바뀐 뒤 다시 열면 새 명단으로 시작하게 한다.
 */
export function RoomLineupButton({ roomId, matchType, candidates, existingGames }: Props) {
    const [open, setOpen] = useState(false)

    return (
        <>
            <Button size="sm" variant="outline" className="h-7 text-caption gap-1" onClick={() => setOpen(true)}>
                자동 대진표
            </Button>
            {open && (
                <RoomLineupDialog
                    open={open}
                    onOpenChange={setOpen}
                    roomId={roomId}
                    matchType={matchType}
                    candidates={candidates}
                    existingGames={existingGames}
                />
            )}
        </>
    )
}

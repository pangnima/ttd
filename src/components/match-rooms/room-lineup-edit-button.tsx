'use client'

import { useState } from 'react'
import type { MatchRoomGame, MatchType } from '@/types'
import type { OpponentCandidate } from '@/lib/queries/users'
import type { EditableLineupGame } from '@/lib/queries/match-rooms'
import { Button } from '@/components/ui/button'
import { RoomLineupEditDialog } from '@/components/match-rooms/room-lineup-edit-dialog'

type Props = {
    roomId: string
    matchType: MatchType
    /** 자리 후보 — 참가자 전원 + 방 게스트 */
    candidates: OpponentCandidate[]
    /** 방 게임 전량 — 편집 대상만 골라 쓴다 */
    games: MatchRoomGame[]
    editable: EditableLineupGame[]
}

/**
 * [대진 편집] — 방장에게만, 그리고 고칠 수 있는 대진이 남아 있을 때만 보인다.
 *
 * 결과가 입력되었거나 협상이 시작된 게임은 목록(`editable`)에서 이미 빠져 있으므로,
 * 방의 대진이 전부 진행된 뒤에는 버튼 자체가 사라진다.
 * 다이얼로그는 열 때 마운트해 방이 바뀐 뒤 다시 열면 새 대진으로 시작하게 한다.
 */
export function RoomLineupEditButton({ roomId, matchType, candidates, games, editable }: Props) {
    const [open, setOpen] = useState(false)
    if (editable.length === 0) return null

    return (
        <>
            <Button size="sm" variant="outline" className="h-7 text-caption gap-1" onClick={() => setOpen(true)}>
                대진 편집
            </Button>
            {open && (
                <RoomLineupEditDialog
                    open={open}
                    onOpenChange={setOpen}
                    roomId={roomId}
                    matchType={matchType}
                    candidates={candidates}
                    games={games}
                    editable={editable}
                />
            )}
        </>
    )
}

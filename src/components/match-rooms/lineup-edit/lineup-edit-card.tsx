'use client'

import { useState } from 'react'
import type { LineupPlayer } from '@/lib/match-games/lineup-core'
import type { LineupSlot } from '@/lib/match-rooms/lineup'
import { toLineupGame, type DraftGame, type DraftSide } from '@/lib/match-rooms/lineup-draft'
import { TYPO } from '@/lib/dashboard/tokens'
import { RoomLineupGameCard } from '@/components/match-rooms/room-lineup-game-card'
import { LineupSlotSelect } from '@/components/match-rooms/lineup-edit/lineup-slot-select'

type Props = {
    game: DraftGame
    index: number
    players: LineupPlayer[]
    restingNames: string[]
    onSlotChange: (side: DraftSide, index: number, player: LineupSlot) => void
    onRemove: () => void
}

const TEAM_BAR: Record<DraftSide, string> = { team1: 'bg-cat-1', team2: 'bg-cat-5' }
const LINK = `${TYPO.caption} text-primary hover:underline shrink-0`
const REMOVE = `${TYPO.caption} text-destructive/80 hover:text-destructive shrink-0`

/**
 * 대진 한 건 — 평소에는 읽기 카드 그대로이고, [수정]을 누른 카드만 자리 드롭다운으로 바뀐다.
 *
 * 모든 카드를 항상 드롭다운으로 펼치지 않는 이유: 복식은 자리가 넷이라 목록 전체가 입력으로 덮이고,
 * 정작 대진을 판단하는 근거인 전력 균형 배지가 묻힌다.
 */
export function LineupEditCard({ game, index, players, restingNames, onSlotChange, onRemove }: Props) {
    const [editing, setEditing] = useState(false)
    const readable = toLineupGame(game, index)

    if (readable && !editing) {
        return (
            <RoomLineupGameCard
                game={readable}
                restingNames={restingNames}
                actions={(
                    <>
                        <button type="button" className={LINK} onClick={() => setEditing(true)}>수정</button>
                        <button type="button" className={REMOVE} onClick={onRemove}>삭제</button>
                    </>
                )}
            />
        )
    }

    const teamSlots = (side: DraftSide) => (
        <div className="flex items-stretch gap-2">
            <span className={`w-1 self-stretch rounded-full shrink-0 ${TEAM_BAR[side]}`} aria-hidden />
            <div className="grid gap-1.5 flex-1 min-w-0 sm:grid-cols-2">
                {game[side].map((slot, i) => (
                    <LineupSlotSelect
                        key={`${side}-${i}`}
                        label={`게임 ${index + 1} ${side === 'team1' ? '우리 팀' : '상대 팀'} ${i + 1}`}
                        players={players}
                        value={slot}
                        onChange={(p) => onSlotChange(side, i, p)}
                    />
                ))}
            </div>
        </div>
    )

    return (
        <li className="px-3 py-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
                <span className={TYPO.eyebrow}>게임 {index + 1}</span>
                <div className="flex items-center gap-2 shrink-0">
                    {readable && (
                        <button type="button" className={LINK} onClick={() => setEditing(false)}>완료</button>
                    )}
                    <button type="button" className={REMOVE} onClick={onRemove}>삭제</button>
                </div>
            </div>

            <div className="space-y-1.5">
                {teamSlots('team1')}
                <div className="border-t border-border/60" />
                {teamSlots('team2')}
            </div>
        </li>
    )
}

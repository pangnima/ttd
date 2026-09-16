import Link from 'next/link'
import type { MatchRoomSummary } from '@/types'
import { EMPTY_BLOCK, TYPO, LIST_CARD, TEXT_LINK } from '@/lib/dashboard/tokens'
import type { RoomTurnSummary } from '@/lib/match-rooms/room-turn'
import { MatchRoomCard } from '@/components/match-rooms/match-room-card'

type Props = {
    rooms: MatchRoomSummary[]
    /** 서브섹션 제목. 없으면 제목 없이 목록만 */
    title?: string
    emptyTitle?: string
    emptyHint?: string
    /** 빈 상태에서 유도할 링크 — 문구는 emptyHint */
    emptyHref?: string
    /** roomId → 내 차례 (작업 큐, Week 39) */
    turns?: Map<string, RoomTurnSummary>
}

/** 매칭 리스트의 방 목록 한 덩어리 — 빈 상태 문구까지 포함한다 */
export function RoomListSection({ rooms, title, emptyTitle, emptyHint, emptyHref, turns }: Props) {
    if (rooms.length === 0 && !emptyTitle) return null

    return (
        <section className="space-y-2">
            {title && (
                <div className="flex items-baseline gap-2">
                    <h2 className={TYPO.h3}>{title}</h2>
                    <span className="text-caption text-muted-foreground tabular-nums">{rooms.length}</span>
                </div>
            )}
            {rooms.length === 0 ? (
                <div className={EMPTY_BLOCK}>
                    {emptyTitle}
                    {emptyHint && (
                        <>
                            {' '}
                            {emptyHref
                                ? <Link href={emptyHref} className={TEXT_LINK}>{emptyHint}</Link>
                                : <span className="text-muted-foreground">{emptyHint}</span>}
                        </>
                    )}
                </div>
            ) : (
                <div className={`${LIST_CARD}`}>
                    {rooms.map((room) => <MatchRoomCard key={room.id} room={room} turn={turns?.get(room.id)} />)}
                </div>
            )}
        </section>
    )
}

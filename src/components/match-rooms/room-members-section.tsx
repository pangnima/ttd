import type { MatchRoomDetail } from '@/types'
import { buildMemberRows } from '@/lib/match-rooms/members-view'
import { formatHeadcount } from '@/lib/match-rooms/headcount'
import { countJoined } from '@/lib/match-rooms/headcount'
import { CARD_BASE, TYPO } from '@/lib/dashboard/tokens'
import { RoomMemberRow } from '@/components/match-rooms/room-member-row'

type Props = { detail: MatchRoomDetail; isHost: boolean; children?: React.ReactNode }

/** 참가자 명단 — 회원 멤버(상태별) + 출처 기록의 비회원. 방장이면 합류 신청 행에 승인/거절 버튼. children = 우측 액션(합류 신청 등) */
export function RoomMembersSection({ detail, isHost, children }: Props) {
    const rows = buildMemberRows(detail)
    const joined = countJoined(detail.members)

    return (
        <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
                <h2 className={TYPO.h3}>
                    참가자 <span className="text-caption text-muted-foreground tabular-nums font-normal">{formatHeadcount(joined, detail.room.capacity)}</span>
                </h2>
                {children}
            </div>
            <div className={`${CARD_BASE} divide-y divide-border`}>
                {rows.map((row) => (
                    <RoomMemberRow key={row.key} row={row} roomId={detail.room.id} canModerate={isHost} />
                ))}
            </div>
        </section>
    )
}

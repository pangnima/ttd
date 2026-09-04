import type { MatchRoomDetail } from '@/types'
import { buildMemberRows } from '@/lib/match-rooms/members-view'
import { countJoined, formatHeadcount } from '@/lib/match-rooms/headcount'
import { CARD_BASE, TYPO } from '@/lib/dashboard/tokens'
import { RoomMemberRow } from '@/components/match-rooms/room-member-row'

type Props = { detail: MatchRoomDetail }

/** 참가자 명단 — 회원 멤버(방장·참가·초대 대기) + 출처 기록의 비회원. 정원 없이 참가 인원만 표시(0048) */
export function RoomMembersSection({ detail }: Props) {
    const rows = buildMemberRows(detail)
    const joined = countJoined(detail.members)

    return (
        <section className="space-y-2">
            <h2 className={TYPO.h3}>
                참가자 <span className="text-caption text-muted-foreground tabular-nums font-normal">{formatHeadcount(joined)}</span>
            </h2>
            <div className={`${CARD_BASE} divide-y divide-border`}>
                {rows.map((row) => (
                    <RoomMemberRow key={row.key} row={row} />
                ))}
            </div>
        </section>
    )
}

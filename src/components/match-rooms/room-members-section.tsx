import type { MatchRoomDetail } from '@/types'
import type { OpponentCandidate } from '@/lib/queries/users'
import { buildMemberRows } from '@/lib/match-rooms/members-view'
import { countJoined, formatHeadcount } from '@/lib/match-rooms/headcount'
import { CARD_BASE, TYPO } from '@/lib/dashboard/tokens'
import { RoomMemberRow } from '@/components/match-rooms/room-member-row'
import { RoomInviteMembers } from '@/components/match-rooms/room-invite-members'

type Props = {
    detail: MatchRoomDetail
    /** 초대 자격(방장·참가자)이 있을 때만 넘어온다 — 없으면 명단만 그린다 */
    invite?: { selfUserId: string; candidates: OpponentCandidate[] }
}

/** 참가자 명단 — 회원 멤버(방장·참가·초대 대기) + 출처 기록의 비회원. 정원 없이 참가 인원만 표시(0048) */
export function RoomMembersSection({ detail, invite }: Props) {
    const rows = buildMemberRows(detail)
    const joined = countJoined(detail.members)

    return (
        <section className="space-y-2">
            <div className="flex items-start justify-between gap-3">
                <h2 className={TYPO.h3}>
                    참가자 <span className="text-caption text-muted-foreground tabular-nums font-normal">{formatHeadcount(joined)}</span>
                </h2>
                {invite && !detail.room.isSettled && (
                    <RoomInviteMembers
                        roomId={detail.room.id}
                        selfUserId={invite.selfUserId}
                        candidates={invite.candidates}
                        memberUserIds={detail.members.map((m) => m.userId)}
                    />
                )}
            </div>
            <div className={`${CARD_BASE} divide-y divide-border`}>
                {rows.map((row) => (
                    <RoomMemberRow key={row.key} row={row} />
                ))}
            </div>
        </section>
    )
}

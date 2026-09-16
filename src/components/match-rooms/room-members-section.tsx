import type { MatchRoomDetail } from '@/types'
import { buildMemberRows } from '@/lib/match-rooms/members-view'
import { roomGameMemberIds } from '@/lib/match-rooms/game-status'
import { countJoined, formatHeadcount } from '@/lib/match-rooms/headcount'
import { TYPO, LIST_CARD } from '@/lib/dashboard/tokens'
import { RoomMemberRow } from '@/components/match-rooms/room-member-row'
import { RoomInviteMembers } from '@/components/match-rooms/room-invite-members'

type Props = {
    detail: MatchRoomDetail
    viewerId: string
    /** 호스트 전용 액션(내보내기·다시 초대)을 행에 붙일지 — 호스트에게만 참이다 */
    host?: { viewerId: string }
    /** 초대 자격(호스트·참가자)이 있을 때만 넘어온다 — 없으면 명단만 그린다 */
    invite?: { selfUserId: string }
}

/** 참가자 명단 — 회원 멤버(호스트·참가·초대 대기) + 출처 기록의 비회원. 정원 없이 참가 인원만 표시(0048) */
export function RoomMembersSection({ detail, viewerId, invite, host }: Props) {
    const rows = buildMemberRows(detail)
    const joined = countJoined(detail.members)
    // 경기에 배정된 회원은 내보낼 수 없다(0070) — DB 가드와 같은 집합을 보고 버튼을 감춘다
    const playing = roomGameMemberIds(detail.games)

    return (
        <section className="space-y-2">
            <div className="flex items-start justify-between gap-3">
                <h2 className={TYPO.h3}>
                    참가자 <span className="text-caption text-muted-foreground tabular-nums font-normal">{formatHeadcount(joined, detail.guests.length)}</span>
                </h2>
                {invite && !detail.room.isSettled && (
                    <RoomInviteMembers
                        roomId={detail.room.id}
                        selfUserId={invite.selfUserId}
                        members={detail.members}
                        canReinvite={!!host}
                    />
                )}
            </div>
            <div className={`${LIST_CARD}`}>
                {rows.map((row) => (
                    <RoomMemberRow
                        key={row.key}
                        row={row}
                        roomId={detail.room.id}
                        viewerId={viewerId}
                        host={host}
                        isSettled={detail.room.isSettled}
                        hasGames={!!row.userId && playing.has(row.userId)}
                    />
                ))}
            </div>
        </section>
    )
}

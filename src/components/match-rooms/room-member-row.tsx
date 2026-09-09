import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ProfileLink } from '@/components/common/profile-link'
import { PILL_BASE, TYPO } from '@/lib/dashboard/tokens'
import type { MemberRowView } from '@/lib/match-rooms/members-view'
import { canKickRoomMember, canRemoveRoomGuest } from '@/lib/match-rooms/kick'
import { MemberMetaLine } from '@/components/match-rooms/member-meta-line'
import { RoomMemberHostActions } from '@/components/match-rooms/room-member-host-actions'
import { RoomGuestRemoveButton } from '@/components/match-rooms/room-guest-remove-button'

type Props = {
    row: MemberRowView
    roomId: string
    isSettled: boolean
    /** 보고 있는 사람 — 게스트 [빼기]는 방장이 아니어도 '등록한 본인'에게 열린다(0069) */
    viewerId: string
    /** 이 방의 경기에 배정된 회원 — 내보내기 대상이 아니다(0070) */
    hasGames?: boolean
    /** 방장에게만 넘어온다 — 내보내기·다시 초대 */
    host?: { viewerId: string }
}

const STATUS_CLASS: Record<string, string> = {
    '방장': 'border-primary/40 text-primary',
    '참가': 'border-win/40 text-win',
    '초대 대기': 'border-spot/50 text-spot',
    '확인 대기': 'border-spot/50 text-spot',
}

// NTRP는 이름 옆에 붙는다 — 실력이 곧 그 사람을 고르는 기준이라 이름과 한 덩어리로 읽혀야 한다.
// shrink-0이라 어떤 폭에서도 잘리지 않고, 잘리는 것은 언제나 이름 뒤의 메타(닉네임·라켓)다.
const NTRP_BADGE = `${PILL_BASE} ${TYPO.micro} shrink-0 border-border text-foreground tabular-nums`

/** 명단 1행 — 1줄: 아바타·이름(회원이면 프로필 링크)·NTRP·상태 칩 / 2줄: 닉네임·주력손·라켓 */
export function RoomMemberRow({ row, roomId, isSettled, viewerId, hasGames = false, host }: Props) {
    const name = (
        <span className="text-body2 font-medium text-foreground truncate">
            {row.name}
            {row.deleted && <span className="ml-1 text-caption text-muted-foreground">(탈퇴)</span>}
        </span>
    )
    const canKick = !!host && canKickRoomMember({ isHost: true, isSettled, row, hasGames, viewerId: host.viewerId })
    const canRemoveGuest = canRemoveRoomGuest({ isHost: !!host, isSettled, viewerId, row })

    return (
        <div className="flex items-center gap-3 px-4 py-2.5">
            <Avatar className="w-8 h-8 shrink-0">
                {row.profileImage && <AvatarImage src={row.profileImage} alt={row.name} />}
                <AvatarFallback className="bg-muted text-muted-foreground text-caption font-bold">{row.name[0]}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 min-w-0">
                    {row.userId && !row.deleted ? (
                        <ProfileLink userId={row.userId} isGuest={false} className="min-w-0 truncate hover:underline">{name}</ProfileLink>
                    ) : name}
                    {/* 탈퇴 회원은 익명화 대상이라 실력을 남기지 않는다 */}
                    {row.ntrp != null && !row.deleted && (
                        <span className={NTRP_BADGE}>NTRP {row.ntrp.toFixed(1)}</span>
                    )}
                </div>
                <MemberMetaLine row={row} />
            </div>
            <span className={`${PILL_BASE} shrink-0 ${STATUS_CLASS[row.statusLabel] ?? 'border-border text-muted-foreground'}`}>
                {row.statusLabel}
            </span>
            {canKick && row.userId && (
                <RoomMemberHostActions roomId={roomId} userId={row.userId} name={row.name} />
            )}
            {canRemoveGuest && row.guestId && (
                <RoomGuestRemoveButton roomId={roomId} guestId={row.guestId} name={row.name} />
            )}
        </div>
    )
}

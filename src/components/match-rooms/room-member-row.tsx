import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ProfileLink } from '@/components/common/profile-link'
import { PILL_BASE } from '@/lib/dashboard/tokens'
import type { MemberRowView } from '@/lib/match-rooms/members-view'
import { canKickRoomMember, canReinviteRoomMember } from '@/lib/match-rooms/kick'
import { MemberMetaLine } from '@/components/match-rooms/member-meta-line'
import { RoomMemberHostActions } from '@/components/match-rooms/room-member-host-actions'

type Props = {
    row: MemberRowView
    roomId: string
    isSettled: boolean
    /** 방장에게만 넘어온다 — 내보내기·다시 초대 */
    host?: { viewerId: string }
}

const STATUS_CLASS: Record<string, string> = {
    '방장': 'border-primary/40 text-primary',
    '참가': 'border-win/40 text-win',
    '초대 대기': 'border-spot/50 text-spot',
    '확인 대기': 'border-spot/50 text-spot',
    '강퇴됨': 'border-border text-muted-foreground',
}

/** 명단 1행 — 1줄: 아바타·이름(회원이면 프로필 링크)·상태 칩 / 2줄: NTRP·주력손·라켓 */
export function RoomMemberRow({ row, roomId, isSettled, host }: Props) {
    const name = (
        <span className="text-body2 font-medium text-foreground truncate">
            {row.name}
            {row.deleted && <span className="ml-1 text-caption text-muted-foreground">(탈퇴)</span>}
        </span>
    )
    const args = { isHost: !!host, isSettled, row }
    const mode = host && canKickRoomMember({ ...args, viewerId: host.viewerId })
        ? 'kick' as const
        : host && canReinviteRoomMember(args) ? 'reinvite' as const : null

    return (
        <div className="flex items-center gap-3 px-4 py-2.5">
            <Avatar className="w-8 h-8 shrink-0">
                {row.profileImage && <AvatarImage src={row.profileImage} alt={row.name} />}
                <AvatarFallback className="bg-muted text-muted-foreground text-caption font-bold">{row.name[0]}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
                {row.userId && !row.deleted ? (
                    <ProfileLink userId={row.userId} isGuest={false} className="hover:underline">{name}</ProfileLink>
                ) : name}
                <MemberMetaLine row={row} />
            </div>
            <span className={`${PILL_BASE} shrink-0 ${STATUS_CLASS[row.statusLabel] ?? 'border-border text-muted-foreground'}`}>
                {row.statusLabel}
            </span>
            {mode && row.userId && (
                <RoomMemberHostActions roomId={roomId} userId={row.userId} name={row.name} mode={mode} />
            )}
        </div>
    )
}

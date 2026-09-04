import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ProfileLink } from '@/components/common/profile-link'
import { PILL_BASE } from '@/lib/dashboard/tokens'
import type { MemberRowView } from '@/lib/match-rooms/members-view'

type Props = { row: MemberRowView }

const STATUS_CLASS: Record<string, string> = {
    '방장': 'border-primary/40 text-primary',
    '참가': 'border-win/40 text-win',
    '초대 대기': 'border-orange-400/50 text-orange-600 dark:text-orange-400',
    '확인 대기': 'border-orange-400/50 text-orange-600 dark:text-orange-400',
}

/** 명단 1행 — 아바타·이름(회원이면 프로필 링크)·상태 칩 */
export function RoomMemberRow({ row }: Props) {
    const name = (
        <span className="text-body2 font-medium text-foreground truncate">
            {row.name}
            {row.deleted && <span className="ml-1 text-caption text-muted-foreground">(탈퇴)</span>}
        </span>
    )
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
                {row.nickname && <p className="text-caption text-muted-foreground truncate">{row.nickname}</p>}
            </div>
            <span className={`${PILL_BASE} shrink-0 ${STATUS_CLASS[row.statusLabel] ?? 'border-border text-muted-foreground'}`}>
                {row.statusLabel}
            </span>
        </div>
    )
}

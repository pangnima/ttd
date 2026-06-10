import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { GuestBadge } from '@/components/common/guest-badge'
import { ProvisionalBadge } from '@/components/common/provisional-badge'
import { formatClubRating } from '@/lib/rating/display'
import type { User } from '@/types'

type Props = {
    user: User
    clubName?: string
    clubRating?: number
    provisional?: boolean
}

const genderLabel: Record<User['gender'], string> = {
    male: '남',
    female: '여',
}

const handLabel: Record<User['dominantHand'], string> = {
    right: '오른손잡이',
    left: '왼손잡이',
}

export function MemberProfileHeader({ user, clubName, clubRating, provisional }: Props) {
    return (
        <div className="flex items-start gap-4">
            <Avatar className="w-16 h-16 shrink-0">
                {user.profileImage && (
                    <AvatarImage src={user.profileImage} alt={user.nickname} />
                )}
                <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">
                    {user.nickname[0] ?? user.name[0] ?? '?'}
                </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-bold">{user.name}</h1>
                    <span className="text-sm text-muted-foreground">({user.nickname})</span>
                    {user.isGuest && <GuestBadge />}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">
                        {genderLabel[user.gender]} · {handLabel[user.dominantHand]}
                    </span>
                    {clubRating !== undefined && (
                        <Badge variant="outline" className="text-xs font-mono text-cyan-600 border-cyan-500/40 dark:text-cyan-400">
                            클럽 {formatClubRating(clubRating)}
                        </Badge>
                    )}
                    {provisional && <ProvisionalBadge />}
                    {user.isGuest ? (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                            NTRP -
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-xs font-mono">
                            NTRP {user.ntrp.toFixed(1)}
                        </Badge>
                    )}
                </div>

                {clubName && (
                    <p className="text-xs text-muted-foreground">
                        {clubName} 클럽 기준 통계
                    </p>
                )}
            </div>
        </div>
    )
}

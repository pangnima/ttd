import Link from 'next/link'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { GuestBadge } from '@/components/common/guest-badge'
import { ProvisionalBadge } from '@/components/common/provisional-badge'
import { calcWinRate } from '@/lib/dashboard/tokens'
import { formatClubRating, isProvisional } from '@/lib/rating/display'
import type { ClubMember, ClubRating, User } from '@/types'

type MemberListItemProps = {
    member: ClubMember
    user: User
    clubId?: string
    clubRating?: ClubRating
    wins?: number
    losses?: number
}

const roleLabel: Record<ClubMember['role'], string> = {
    owner: '운영자',
    officer: '임원',
    member: '회원',
}

const roleBadgeVariant: Record<ClubMember['role'], 'default' | 'secondary' | 'outline'> = {
    owner: 'default',
    officer: 'outline',
    member: 'secondary',
}

const genderLabel: Record<User['gender'], string> = {
    male: '남',
    female: '여',
}

const handLabel: Record<User['dominantHand'], string> = {
    right: '오른손',
    left: '왼손',
}

export function MemberListItem({ member, user, clubId, clubRating, wins, losses }: MemberListItemProps) {
    const winRate = calcWinRate(wins ?? 0, losses ?? 0)
    const hasClubRating = !!clubRating && clubRating.matchesPlayed > 0

    const inner = (
        <>
            <Avatar className="w-9 h-9 shrink-0">
                <AvatarFallback className="text-sm">
                    {user.name[0]}
                </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium">{user.name}</p>
                    <span className="text-xs text-muted-foreground">({user.nickname})</span>
                    {user.isGuest && <GuestBadge />}
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                        {genderLabel[user.gender]} · {handLabel[user.dominantHand]}
                    </span>
                    {winRate !== null && (
                        <>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground">
                                {wins}승 {losses}패 ({winRate}%)
                            </span>
                        </>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                {hasClubRating && (
                    <Badge variant="outline" className="text-xs font-mono text-cyan-600 border-cyan-500/40 dark:text-cyan-400">
                        클럽 {formatClubRating(clubRating!.rating)}
                    </Badge>
                )}
                {hasClubRating && isProvisional(clubRating!.matchesPlayed) && <ProvisionalBadge />}
                <Badge variant="outline" className="text-xs font-mono">
                    NTRP {user.ntrp.toFixed(1)}
                </Badge>
                <Badge
                    variant={roleBadgeVariant[member.role]}
                    className={member.role === 'officer' ? 'text-xs text-blue-600 border-blue-300' : 'text-xs'}
                >
                    {roleLabel[member.role]}
                </Badge>
            </div>
        </>
    )

    if (user.isGuest) {
        return (
            <div className="flex items-center gap-3 py-3 px-4">
                {inner}
            </div>
        )
    }

    return (
        <Link
            href={clubId ? `/profile/${user.id}?clubId=${clubId}` : `/profile/${user.id}`}
            className="flex items-center gap-3 py-3 px-4 hover:bg-muted/30 transition-colors"
        >
            {inner}
        </Link>
    )
}

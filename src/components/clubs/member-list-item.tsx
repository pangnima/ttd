import Link from 'next/link'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { ClubMember, User } from '@/types'

type MemberListItemProps = {
    member: ClubMember
    user: User
    wins?: number
    losses?: number
}

const roleLabel: Record<ClubMember['role'], string> = {
    owner: '운영자',
    member: '회원',
}

const genderLabel: Record<User['gender'], string> = {
    male: '남',
    female: '여',
}

const handLabel: Record<User['dominantHand'], string> = {
    right: '오른손',
    left: '왼손',
}

export function MemberListItem({ member, user, wins, losses }: MemberListItemProps) {
    const totalMatches = (wins ?? 0) + (losses ?? 0)
    const winRate = totalMatches === 0 ? null : Math.round(((wins ?? 0) / totalMatches) * 100)

    return (
        <Link
            href={`/profile/${user.id}`}
            className="flex items-center gap-3 py-3 px-4 hover:bg-muted/30 transition-colors"
        >
            <Avatar className="w-9 h-9 shrink-0">
                <AvatarFallback className="text-sm">
                    {user.name[0]}
                </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium">{user.name}</p>
                    <span className="text-xs text-muted-foreground">({user.nickname})</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                        {genderLabel[user.gender]} · {handLabel[user.dominantHand]}
                    </span>
                    {totalMatches > 0 && (
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
                <Badge variant="outline" className="text-xs font-mono">
                    NTRP {user.ntrp.toFixed(1)}
                </Badge>
                <Badge variant={member.role === 'owner' ? 'default' : 'secondary'} className="text-xs">
                    {roleLabel[member.role]}
                </Badge>
            </div>
        </Link>
    )
}

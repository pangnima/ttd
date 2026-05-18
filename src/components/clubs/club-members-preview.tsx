import Link from 'next/link'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { GuestBadge } from '@/components/common/guest-badge'
import type { MemberWithUser } from '@/lib/queries/clubs'

type ClubMembersPreviewProps = {
    members: MemberWithUser[]
    maxDisplay?: number
}

export function ClubMembersPreview({ members, maxDisplay = 8 }: ClubMembersPreviewProps) {
    const displayMembers = members.slice(0, maxDisplay)

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {displayMembers.map((m) => {
                const cardContent = (
                    <>
                        <Avatar className="w-8 h-8 shrink-0">
                            <AvatarFallback className="text-xs">{m.user.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <p className="text-xs font-medium truncate">
                                {m.role === 'owner' ? '👑 ' : ''}{m.user.name}
                            </p>
                            <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground font-mono">
                                    {m.user.ntrp.toFixed(1)}
                                </span>
                                {m.user.isGuest && <GuestBadge />}
                            </div>
                        </div>
                    </>
                )

                if (m.user.isGuest) {
                    return (
                        <div
                            key={m.userId}
                            className="flex items-center gap-2 p-2.5 rounded-lg border"
                        >
                            {cardContent}
                        </div>
                    )
                }

                return (
                    <Link
                        key={m.userId}
                        href={`/profile/${m.userId}`}
                        className="flex items-center gap-2 p-2.5 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                        {cardContent}
                    </Link>
                )
            })}
            {members.length > maxDisplay && (
                <div className="flex items-center justify-center p-2.5 rounded-lg border border-dashed">
                    <span className="text-xs text-muted-foreground">+{members.length - maxDisplay}명</span>
                </div>
            )}
        </div>
    )
}

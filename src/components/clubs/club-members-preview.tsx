import Link from 'next/link'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { GuestBadge } from '@/components/common/guest-badge'
import { CARD_BASE, CARD_HOVER } from '@/lib/dashboard/tokens'
import { formatClubRating } from '@/lib/rating/display'
import type { MemberWithUser } from '@/lib/queries/clubs'
import type { ClubRating } from '@/types'

type ClubMembersPreviewProps = {
    members: MemberWithUser[]
    maxDisplay?: number
    clubRatings?: Record<string, ClubRating>
}

export function ClubMembersPreview({ members, maxDisplay = 8, clubRatings = {} }: ClubMembersPreviewProps) {
    const displayMembers = members.slice(0, maxDisplay)

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {displayMembers.map((m) => {
                const clubRating = clubRatings[m.userId]
                const cardContent = (
                    <>
                        <Avatar className="w-8 h-8 shrink-0">
                            <AvatarFallback className="text-xs text-foreground/75">{m.user.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground/90 truncate">
                                {m.role === 'owner' ? '👑 ' : ''}{m.user.name}
                            </p>
                            <div className="flex items-center gap-1">
                                {clubRating && clubRating.matchesPlayed > 0 && (
                                    <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400">
                                        {formatClubRating(clubRating.rating)}
                                    </span>
                                )}
                                <span className="text-xs text-foreground/55 font-mono">
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
                            className={`${CARD_BASE} flex items-center gap-2 p-2.5`}
                        >
                            {cardContent}
                        </div>
                    )
                }

                return (
                    <Link
                        key={m.userId}
                        href={`/profile/${m.userId}?clubId=${m.clubId}`}
                        className={`${CARD_BASE} ${CARD_HOVER} flex items-center gap-2 p-2.5`}
                    >
                        {cardContent}
                    </Link>
                )
            })}
            {members.length > maxDisplay && (
                <div className="flex items-center justify-center p-2.5 rounded-xl border border-dashed border-foreground/10">
                    <span className="text-xs text-foreground/55">+{members.length - maxDisplay}명</span>
                </div>
            )}
        </div>
    )
}

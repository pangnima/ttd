'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getStoredMatches } from '@/lib/store/match-store'
import { calcPlayerStats } from '@/lib/stats'
import { getUserById } from '@/lib/dummy/users'
import type { ClubMember, Match } from '@/types'

type ClubMembersPreviewProps = {
    members: ClubMember[]
    maxDisplay?: number
}

export function ClubMembersPreview({ members, maxDisplay = 8 }: ClubMembersPreviewProps) {
    const [allMatches, setAllMatches] = useState<Match[]>([])

    useEffect(() => {
        setAllMatches(getStoredMatches())
    }, [])

    const displayMembers = members.slice(0, maxDisplay)

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {displayMembers.map((m) => {
                const user = getUserById(m.userId)
                if (!user) return null
                const stats = calcPlayerStats(allMatches, m.userId)
                return (
                    <Link
                        key={m.userId}
                        href={`/profile/${m.userId}`}
                        className="flex items-center gap-2 p-2.5 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                        <Avatar className="w-8 h-8 shrink-0">
                            <AvatarFallback className="text-xs">{user.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <p className="text-xs font-medium truncate">
                                {m.role === 'owner' ? '👑 ' : ''}{user.name}
                            </p>
                            <div className="flex items-center gap-1 flex-wrap">
                                <span className="text-xs text-muted-foreground font-mono">
                                    {user.ntrp.toFixed(1)}
                                </span>
                                {stats.totalMatches > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                        · {stats.wins}승{stats.losses}패
                                    </span>
                                )}
                            </div>
                        </div>
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

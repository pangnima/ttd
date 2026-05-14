'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { UserCheck } from 'lucide-react'
import { getStoredClubs } from '@/lib/store/club-store'
import {
    getPendingMembersByClubId,
    approveMember,
    rejectMember,
} from '@/lib/store/club-member-store'
import { getUserById } from '@/lib/dummy/users'
import { dummyClubs } from '@/lib/dummy/clubs'
import type { Club, ClubMember } from '@/types'

type Props = {
    currentUserId: string
}

type PendingEntry = {
    club: Club
    member: ClubMember
    userName: string
}

export function PendingMembersCard({ currentUserId }: Props) {
    const [entries, setEntries] = useState<PendingEntry[]>([])

    const loadPending = useCallback(() => {
        const allClubs = [...dummyClubs, ...getStoredClubs()]
        const ownedClubs = allClubs.filter((c) => c.ownerId === currentUserId)

        const pending: PendingEntry[] = []
        ownedClubs.forEach((club) => {
            const pendingMembers = getPendingMembersByClubId(club.id)
            pendingMembers.forEach((m) => {
                const user = getUserById(m.userId)
                pending.push({
                    club,
                    member: m,
                    userName: user?.name ?? m.userId,
                })
            })
        })
        setEntries(pending)
    }, [currentUserId])

    useEffect(() => {
        loadPending()
    }, [loadPending])

    const handleApprove = (userId: string, clubId: string) => {
        approveMember(userId, clubId)
        loadPending()
    }

    const handleReject = (userId: string, clubId: string) => {
        rejectMember(userId, clubId)
        loadPending()
    }

    if (entries.length === 0) return null

    return (
        <Card className="bg-card border-white/5">
            <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    가입 승인 대기
                    <Badge className="ml-1 text-xs bg-emerald-500/20 text-emerald-400 border-0">
                        {entries.length}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
                {entries.map(({ club, member, userName }) => (
                    <div
                        key={`${member.clubId}-${member.userId}`}
                        className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/5"
                    >
                        <Avatar className="w-7 h-7 shrink-0">
                            <AvatarFallback className="text-xs bg-emerald-500/20 text-emerald-400">
                                {userName[0]}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{userName}</p>
                            <p className="text-xs text-muted-foreground truncate">{club.name}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                            <Button
                                size="sm"
                                className="h-6 text-xs px-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-0"
                                variant="outline"
                                onClick={() => handleApprove(member.userId, member.clubId)}
                            >
                                승인
                            </Button>
                            <Button
                                size="sm"
                                className="h-6 text-xs px-2"
                                variant="ghost"
                                onClick={() => handleReject(member.userId, member.clubId)}
                            >
                                거절
                            </Button>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}

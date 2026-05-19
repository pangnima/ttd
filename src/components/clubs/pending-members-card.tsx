'use client'

import { useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { UserCheck } from 'lucide-react'
import { approveMemberAction, rejectMemberAction } from '@/lib/actions/club-members'
import type { PendingEntry } from '@/lib/queries/clubs'

type Props = {
    entries: PendingEntry[]
}

export function PendingMembersCard({ entries }: Props) {
    const [isPending, startTransition] = useTransition()

    if (entries.length === 0) return null

    const handleApprove = (clubId: string, userId: string) =>
        startTransition(async () => { await approveMemberAction(clubId, userId) })

    const handleReject = (clubId: string, userId: string) =>
        startTransition(async () => { await rejectMemberAction(clubId, userId) })

    return (
        <Card className="bg-card border-foreground/5">
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
                {entries.map(({ club, member, user }) => (
                    <div
                        key={`${member.clubId}-${member.userId}`}
                        className="flex items-center gap-2.5 p-2.5 rounded-lg bg-foreground/5"
                    >
                        <Avatar className="w-7 h-7 shrink-0">
                            <AvatarFallback className="text-xs bg-emerald-500/20 text-emerald-400">
                                {user.name[0]}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{club.name}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                            <Button
                                size="sm"
                                className="h-6 text-xs px-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-0"
                                variant="outline"
                                onClick={() => handleApprove(member.clubId, member.userId)}
                                disabled={isPending}
                            >
                                승인
                            </Button>
                            <Button
                                size="sm"
                                className="h-6 text-xs px-2"
                                variant="ghost"
                                onClick={() => handleReject(member.clubId, member.userId)}
                                disabled={isPending}
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

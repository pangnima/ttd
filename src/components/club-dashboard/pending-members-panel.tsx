'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { approveMemberAction, rejectMemberAction } from '@/lib/actions/club-members'
import type { PendingMemberWithUser } from '@/lib/queries/club-dashboard'
import { CARD_BASE, SECTION_LABEL } from '@/lib/dashboard/tokens'
import { Clock } from 'lucide-react'

type PendingMembersPanelProps = {
    clubId: string
    pendingMembers: PendingMemberWithUser[]
}

export function PendingMembersPanel({ clubId, pendingMembers }: PendingMembersPanelProps) {
    const [isPending, startTransition] = useTransition()

    if (pendingMembers.length === 0) return null

    const handleApprove = (userId: string) =>
        startTransition(async () => { await approveMemberAction(clubId, userId) })

    const handleReject = (userId: string) =>
        startTransition(async () => { await rejectMemberAction(clubId, userId) })

    return (
        <section className="space-y-3">
            <div className="flex items-center gap-2">
                <p className={SECTION_LABEL}>가입 대기</p>
                <Badge variant="outline" className="text-xs text-orange-500 border-orange-400/50">
                    {pendingMembers.length}명
                </Badge>
            </div>
            <div className={`${CARD_BASE} divide-y divide-border`}>
                {pendingMembers.map((m) => (
                    <div key={m.userId} className="flex items-center justify-between px-4 py-3 gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                            <Clock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                            <div className="min-w-0">
                                <p className="text-sm text-foreground truncate">{m.user.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{m.user.nickname}</p>
                            </div>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                            <Button
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => handleApprove(m.userId)}
                                disabled={isPending}
                            >
                                승인
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => handleReject(m.userId)}
                                disabled={isPending}
                            >
                                거절
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}

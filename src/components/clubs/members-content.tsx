'use client'

import { useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { MemberListItem } from '@/components/clubs/member-list-item'
import { approveMemberAction, rejectMemberAction } from '@/lib/actions/club-members'
import type { MemberWithUser } from '@/lib/queries/clubs'

type MembersContentProps = {
    clubId: string
    clubName: string
    members: MemberWithUser[]
    pendingMembers: MemberWithUser[]
    isOwner: boolean
}

export function MembersContent({ clubName, members, pendingMembers, isOwner }: MembersContentProps) {
    const [isPending, startTransition] = useTransition()

    const handleApprove = (clubId: string, userId: string) =>
        startTransition(async () => { await approveMemberAction(clubId, userId) })

    const handleReject = (clubId: string, userId: string) =>
        startTransition(async () => { await rejectMemberAction(clubId, userId) })

    return (
        <>
            <div className="mb-6">
                <h1 className="text-2xl font-bold">회원 목록</h1>
                {clubName && <p className="text-sm text-muted-foreground mt-1">{clubName}</p>}
            </div>

            <section>
                <div className="flex items-center gap-2 mb-2">
                    <h2 className="font-semibold text-sm">승인된 회원</h2>
                    <Badge variant="secondary" className="text-xs">{members.length}명</Badge>
                </div>
                <div className="border rounded-lg divide-y">
                    {members.map((m) => (
                        <MemberListItem
                            key={m.userId}
                            member={m}
                            user={m.user}
                        />
                    ))}
                </div>
            </section>

            {pendingMembers.length > 0 && (
                <>
                    <Separator className="my-6" />
                    <section>
                        <div className="flex items-center gap-2 mb-2">
                            <h2 className="font-semibold text-sm">가입 대기</h2>
                            <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                                {pendingMembers.length}명
                            </Badge>
                        </div>
                        <div className="border rounded-lg divide-y border-dashed">
                            {pendingMembers.map((m) => (
                                <div key={m.userId} className="flex items-center justify-between pr-3">
                                    <div className="flex-1 opacity-60">
                                        <MemberListItem member={m} user={m.user} />
                                    </div>
                                    {isOwner && (
                                        <div className="flex gap-1.5 shrink-0">
                                            <Button
                                                size="sm"
                                                className="h-7 text-xs"
                                                onClick={() => handleApprove(m.clubId, m.userId)}
                                                disabled={isPending}
                                            >
                                                승인
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 text-xs"
                                                onClick={() => handleReject(m.clubId, m.userId)}
                                                disabled={isPending}
                                            >
                                                거절
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        {!isOwner && (
                            <p className="text-xs text-muted-foreground mt-2">
                                ※ 승인/거절은 클럽 운영자만 가능합니다.
                            </p>
                        )}
                    </section>
                </>
            )}
        </>
    )
}

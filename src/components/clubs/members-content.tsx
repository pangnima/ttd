'use client'

import { useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MemberListItem } from '@/components/clubs/member-list-item'
import {
    approveMemberAction,
    rejectMemberAction,
    assignOfficerAction,
    removeOfficerAction,
} from '@/lib/actions/club-members'
import type { MemberWithUser } from '@/lib/queries/clubs'
import type { ClubMember } from '@/types'

type MembersContentProps = {
    clubId: string
    clubName: string
    members: MemberWithUser[]
    pendingMembers: MemberWithUser[]
    currentUserRole: ClubMember['role'] | null
}

export function MembersContent({
    clubId,
    clubName,
    members,
    pendingMembers,
    currentUserRole,
}: MembersContentProps) {
    const [isPending, startTransition] = useTransition()

    const isOwner = currentUserRole === 'owner'
    const canManagePending = currentUserRole === 'owner' || currentUserRole === 'officer'

    const handleApprove = (userId: string) =>
        startTransition(async () => { await approveMemberAction(clubId, userId) })

    const handleReject = (userId: string) =>
        startTransition(async () => { await rejectMemberAction(clubId, userId) })

    const handleAssignOfficer = (userId: string) =>
        startTransition(async () => { await assignOfficerAction(clubId, userId) })

    const handleRemoveOfficer = (userId: string) =>
        startTransition(async () => { await removeOfficerAction(clubId, userId) })

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
                        <div key={m.userId} className="flex items-center pr-2">
                            <div className="flex-1 min-w-0">
                                <MemberListItem
                                    member={m}
                                    user={m.user}
                                    clubId={clubId}
                                />
                            </div>
                            {isOwner && m.role !== 'owner' && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger
                                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md p-0 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                                        disabled={isPending}
                                    >
                                        ···
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {m.role === 'member' ? (
                                            <DropdownMenuItem
                                                onClick={() => handleAssignOfficer(m.userId)}
                                            >
                                                임원으로 지정
                                            </DropdownMenuItem>
                                        ) : (
                                            <DropdownMenuItem
                                                onClick={() => handleRemoveOfficer(m.userId)}
                                            >
                                                임원 해제
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
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
                                    {canManagePending && (
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
                                    )}
                                </div>
                            ))}
                        </div>
                        {!canManagePending && (
                            <p className="text-xs text-muted-foreground mt-2">
                                ※ 승인/거절은 운영자 또는 임원만 가능합니다.
                            </p>
                        )}
                    </section>
                </>
            )}
        </>
    )
}

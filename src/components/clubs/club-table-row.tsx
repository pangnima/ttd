'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import { Users, MapPin, Clock } from 'lucide-react'
import { applyToClubAction, cancelApplicationAction, leaveClubAction } from '@/lib/actions/club-members'
import type { Club, ClubMember } from '@/types'

type MembershipStatus = ClubMember['status'] | null

type ClubTableRowProps = {
    club: Club
    membershipStatus?: MembershipStatus
}

export function ClubTableRow({ club, membershipStatus }: ClubTableRowProps) {
    const [isPending, startTransition] = useTransition()
    const initial = club.name.charAt(0)

    const handleApply = () => startTransition(async () => { await applyToClubAction(club.id) })
    const handleCancel = () => startTransition(async () => { await cancelApplicationAction(club.id) })
    const handleLeave = () => startTransition(async () => { await leaveClubAction(club.id) })

    return (
        <TableRow className="hover:bg-muted/50 transition-colors">
            <TableCell>
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-sm">
                        {initial}
                    </div>
                    <div>
                        <Link
                            href={`/clubs/${club.id}`}
                            className="font-medium text-sm hover:text-primary transition-colors"
                        >
                            {club.name}
                        </Link>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-xs">
                            {club.description}
                        </p>
                    </div>
                </div>
            </TableCell>
            <TableCell>
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" />
                    {club.region}
                </span>
            </TableCell>
            <TableCell>
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    {club.memberCount}명
                </span>
            </TableCell>
            <TableCell className="text-right">
                {membershipStatus === 'approved' ? (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={handleLeave}
                        disabled={isPending}
                    >
                        탈퇴
                    </Button>
                ) : membershipStatus === 'pending' ? (
                    <div className="flex items-center justify-end gap-1.5">
                        <span className="flex items-center gap-1 text-xs text-amber-500">
                            <Clock className="w-3 h-3" />
                            가입승인 대기중
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs px-2 text-muted-foreground hover:text-destructive"
                            onClick={handleCancel}
                            disabled={isPending}
                        >
                            취소
                        </Button>
                    </div>
                ) : (
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-3"
                        onClick={handleApply}
                        disabled={isPending}
                    >
                        가입 신청
                    </Button>
                )}
            </TableCell>
        </TableRow>
    )
}

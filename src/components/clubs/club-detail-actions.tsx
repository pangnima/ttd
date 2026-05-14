'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Clock, UserPlus } from 'lucide-react'
import { applyToClubAction, cancelApplicationAction } from '@/lib/actions/club-members'
import type { ClubMember } from '@/types'

type Props = {
    clubId: string
    membershipStatus: ClubMember['status'] | null
}

export function ClubDetailActions({ clubId, membershipStatus }: Props) {
    const [isPending, startTransition] = useTransition()

    if (membershipStatus === 'approved') return null

    if (membershipStatus === 'pending') {
        return (
            <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs text-amber-500">
                    <Clock className="w-3.5 h-3.5" />
                    가입승인 대기중
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs text-destructive border-destructive/40 hover:bg-destructive/10"
                    onClick={() => startTransition(async () => { await cancelApplicationAction(clubId) })}
                    disabled={isPending}
                >
                    신청 취소
                </Button>
            </div>
        )
    }

    return (
        <Button
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => startTransition(async () => { await applyToClubAction(clubId) })}
            disabled={isPending}
        >
            <UserPlus className="w-3.5 h-3.5" />
            가입 신청
        </Button>
    )
}

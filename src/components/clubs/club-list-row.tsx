'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { MapPin, Users, ChevronRight } from 'lucide-react'
import { applyToClubAction, cancelApplicationAction } from '@/lib/actions/club-members'
import { CARD_BASE, CARD_HOVER, PILL_BASE } from '@/lib/dashboard/tokens'
import { ClubAvatar } from '@/components/clubs/club-avatar'
import type { Club, ClubMember } from '@/types'

type ClubListRowProps = {
    club: Club
    membershipStatus: ClubMember['status'] | null
    isOwner: boolean
}

export function ClubListRow({ club, membershipStatus, isOwner }: ClubListRowProps) {
    const [isPending, startTransition] = useTransition()

    const handleApply = (e: React.MouseEvent) => {
        e.stopPropagation()
        startTransition(async () => { await applyToClubAction(club.id) })
    }

    const handleCancel = (e: React.MouseEvent) => {
        e.stopPropagation()
        startTransition(async () => { await cancelApplicationAction(club.id) })
    }

    const pill =
        isOwner && membershipStatus === 'approved' ? (
            <span className={`${PILL_BASE} border-cyan-400/40 text-cyan-400/85 bg-cyan-400/8`}>
                OWNER
            </span>
        ) : membershipStatus === 'approved' ? (
            <span className={`${PILL_BASE} border-foreground/20 text-foreground/65`}>
                멤버
            </span>
        ) : membershipStatus === 'pending' ? (
            <span className={`${PILL_BASE} border-amber-400/40 text-amber-400/85 bg-amber-400/8`}>
                대기중
            </span>
        ) : null

    const actionButton =
        isOwner ? null
        : membershipStatus === 'pending' ? (
            <button
                type="button"
                onClick={handleCancel}
                disabled={isPending}
                className="relative z-10 text-xs border border-foreground/20 rounded-full px-3 py-1 text-foreground/85 hover:bg-foreground/8 hover:border-foreground/35 transition-colors disabled:opacity-40"
            >
                취소
            </button>
        ) : membershipStatus === null ? (
            <button
                type="button"
                onClick={handleApply}
                disabled={isPending}
                className="relative z-10 text-xs border border-foreground/20 rounded-full px-3 py-1 text-foreground/85 hover:bg-foreground/8 hover:border-foreground/35 transition-colors disabled:opacity-40"
            >
                가입 신청
            </button>
        ) : null

    return (
        // overlay link 패턴: <a> 안에 <button> 중첩을 피하기 위해 li에 카드 스타일 적용
        // Link는 전체를 덮는 절대 위치, 버튼은 z-10으로 링크 위에 올림
        <li className={`${CARD_BASE} ${CARD_HOVER} relative flex items-center gap-3 p-4 group`}>
            <Link
                href={`/clubs/${club.id}`}
                className="absolute inset-0 rounded-xl"
                aria-label={club.name}
            />
            <div className="relative z-10">
                <ClubAvatar name={club.name} logoUrl={club.logoUrl} size="md" />
            </div>
            <div className="relative z-10 flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground/90 group-hover:text-foreground transition-colors truncate">
                    {club.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-foreground/60">
                    {club.region && (
                        <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {club.region}
                        </span>
                    )}
                    <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {club.memberCount}명
                    </span>
                </div>
            </div>
            <div className="relative z-10 flex items-center gap-2 shrink-0">
                {pill}
                {actionButton}
                <ChevronRight className="w-4 h-4 text-foreground/45" />
            </div>
        </li>
    )
}

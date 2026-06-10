'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { MapPin, Users, ChevronRight } from 'lucide-react'
import { applyToClubAction, cancelApplicationAction } from '@/lib/actions/club-members'
import { CARD_BASE, CARD_HOVER, PILL_BASE } from '@/lib/dashboard/tokens'
import { ClubAvatar } from '@/components/clubs/club-avatar'
import type { ClubMemberCount } from '@/lib/queries/clubs'
import type { Club, ClubMember } from '@/types'

type ClubListRowProps = {
    club: Club
    membershipStatus: ClubMember['status'] | null
    isOwner: boolean
    memberCount?: ClubMemberCount
}

export function ClubListRow({ club, membershipStatus, isOwner, memberCount }: ClubListRowProps) {
    const regularCount = memberCount?.regular ?? 0
    const guestCount = memberCount?.guest ?? 0
    const [isPending, startTransition] = useTransition()

    const handleApply = () => {
        startTransition(async () => { await applyToClubAction(club.id) })
    }

    const handleCancel = () => {
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
                className="text-xs whitespace-nowrap border border-foreground/20 rounded-full px-3 py-1 text-foreground/85 hover:bg-foreground/8 hover:border-foreground/35 transition-colors disabled:opacity-40"
            >
                취소
            </button>
        ) : membershipStatus === null ? (
            <button
                type="button"
                onClick={handleApply}
                disabled={isPending}
                className="text-xs whitespace-nowrap border border-foreground/20 rounded-full px-3 py-1 text-foreground/85 hover:bg-foreground/8 hover:border-foreground/35 transition-colors disabled:opacity-40"
            >
                가입 신청
            </button>
        ) : null

    return (
        <li className={`${CARD_BASE} flex items-stretch overflow-hidden`}>
            {/* 왼쪽: 클럽 정보 링크 영역 */}
            <Link
                href={`/clubs/${club.id}`}
                className={`flex flex-1 items-center gap-3 p-4 min-w-0 ${CARD_HOVER} group`}
            >
                <ClubAvatar name={club.name} logoUrl={club.logoUrl} size="md" />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground/90 group-hover:text-foreground transition-colors truncate">
                        {club.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-foreground/60 overflow-hidden">
                        {club.region && (
                            <span className="flex items-center gap-1 min-w-0 whitespace-nowrap">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span className="truncate">{club.region}</span>
                            </span>
                        )}
                        <span className="flex items-center gap-1 shrink-0 whitespace-nowrap">
                            <Users className="w-3 h-3 shrink-0" />
                            정회원 {regularCount}
                        </span>
                        {guestCount > 0 && (
                            <span className="text-foreground/45 shrink-0 whitespace-nowrap">
                                · 게스트 {guestCount}
                            </span>
                        )}
                    </div>
                </div>
                <ChevronRight className="w-4 h-4 text-foreground/45 shrink-0" />
            </Link>

            {/* 오른쪽: 상태 pill + 액션 버튼 (고정폭 + 세로 스택으로 카드 간 너비 통일) */}
            {(pill || actionButton) && (
                <div className="flex flex-col items-center justify-center gap-1 shrink-0 w-24 px-2 border-l border-border">
                    {pill}
                    {actionButton}
                </div>
            )}
        </li>
    )
}

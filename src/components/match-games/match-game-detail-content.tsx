'use client'

import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MatchGameTable } from '@/components/match-games/match-game-table'
import { RatingChangeSummary } from '@/components/match-games/rating-change-summary'
import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'
import type { RatingChange, ClubRating } from '@/lib/queries/ratings'
import type { MatchGame, User } from '@/types'

type MatchGameDetailContentProps = {
    matchGame: MatchGame
    members: User[]
    isOwner: boolean
    ratingDeltaByMatch?: Record<string, Record<string, RatingChange>>
    ratingChangeTotals?: Array<{ userId: string } & RatingChange>
    ratingByUser?: Record<string, ClubRating>
    rivalMatchIds?: Set<string>
    currentUserId?: string
    formerMemberIds?: Set<string>
}

export function MatchGameDetailContent({
    matchGame, members, isOwner, ratingDeltaByMatch, ratingChangeTotals, ratingByUser, rivalMatchIds, currentUserId, formerMemberIds,
}: MatchGameDetailContentProps) {
    const canEditMatchGame = !matchGame.isFixed || isOwner

    return (
        <PageContainer>
            <PageHeader
                title={matchGame.name}
                description={matchGame.date}
                actions={
                    canEditMatchGame && (
                        <Link
                            href={`/clubs/${matchGame.clubId}/match-games/${matchGame.id}/edit`}
                            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'shrink-0 gap-1.5')}
                        >
                            <Pencil className="w-3.5 h-3.5" />
                            대진표 수정
                        </Link>
                    )
                }
            />
            {matchGame.isFixed && ratingChangeTotals && (
                <RatingChangeSummary byUserTotal={ratingChangeTotals} members={members} />
            )}
            <MatchGameTable
                matchGame={matchGame}
                members={members}
                clubId={matchGame.clubId}
                isOwner={isOwner}
                ratingDeltaByMatch={ratingDeltaByMatch}
                ratingByUser={ratingByUser}
                rivalMatchIds={rivalMatchIds}
                currentUserId={currentUserId}
                formerMemberIds={formerMemberIds}
            />
        </PageContainer>
    )
}

'use client'

import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MatchGameTable } from '@/components/match-games/match-game-table'
import { RatingChangeSummary } from '@/components/match-games/rating-change-summary'
import { PageContainer } from '@/components/common/page-container'
import type { MatchGame, User } from '@/types'

type MatchGameDetailContentProps = {
    matchGame: MatchGame
    members: User[]
    isOwner: boolean
    ratingDeltaByMatch?: Record<string, Record<string, number>>
    ratingChangeTotals?: Array<{ userId: string; total: number }>
}

export function MatchGameDetailContent({
    matchGame, members, isOwner, ratingDeltaByMatch, ratingChangeTotals,
}: MatchGameDetailContentProps) {
    const canEditMatchGame = !matchGame.isFixed || isOwner

    return (
        <PageContainer>
            <div className="flex items-start justify-between gap-2">
                <div>
                    <h1 className="text-2xl font-bold">{matchGame.name}</h1>
                    <p className="text-sm text-muted-foreground mt-1">{matchGame.date}</p>
                </div>
                {canEditMatchGame && (
                    <Link
                        href={`/clubs/${matchGame.clubId}/match-games/${matchGame.id}/edit`}
                        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'shrink-0 gap-1.5')}
                    >
                        <Pencil className="w-3.5 h-3.5" />
                        대진표 수정
                    </Link>
                )}
            </div>
            {matchGame.isFixed && ratingChangeTotals && (
                <RatingChangeSummary byUserTotal={ratingChangeTotals} members={members} />
            )}
            <MatchGameTable
                matchGame={matchGame}
                members={members}
                clubId={matchGame.clubId}
                isOwner={isOwner}
                ratingDeltaByMatch={ratingDeltaByMatch}
            />
        </PageContainer>
    )
}

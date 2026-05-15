'use client'

import { MatchGameTable } from '@/components/match-games/match-game-table'
import type { MatchGame, User } from '@/types'

type MatchGameDetailContentProps = {
    matchGame: MatchGame
    members: User[]
}

export function MatchGameDetailContent({ matchGame, members }: MatchGameDetailContentProps) {
    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold">{matchGame.name}</h1>
                <p className="text-sm text-muted-foreground mt-1">{matchGame.date}</p>
            </div>
            <MatchGameTable
                matchGame={matchGame}
                members={members}
                clubId={matchGame.clubId}
            />
        </div>
    )
}

'use client'

import { useState, useEffect } from 'react'
import { MatchGameTable } from '@/components/match-games/match-game-table'
import { getStoredClubs } from '@/lib/store/club-store'
import { getStoredMatchGameById } from '@/lib/store/match-game-store'
import { getMembersByClubId, getMembershipStatus } from '@/lib/store/club-member-store'
import { createClient } from '@/lib/supabase/client'
import { getUserById } from '@/lib/dummy/users'
import type { MatchGame, User } from '@/types'

type MatchGameDetailContentProps = {
    clubId: string
    matchGameId: string
}

export function MatchGameDetailContent({ clubId, matchGameId }: MatchGameDetailContentProps) {
    const [matchGame, setMatchGame] = useState<MatchGame | null>(null)
    const [members, setMembers] = useState<User[]>([])
    const [isNotFound, setIsNotFound] = useState(false)

    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) {
                setIsNotFound(true)
                return
            }

            const club = getStoredClubs().find((c) => c.id === clubId)
            if (!club) {
                setIsNotFound(true)
                return
            }

            const membership = getMembershipStatus(user.id, clubId)
            if (membership !== 'approved') {
                setIsNotFound(true)
                return
            }

            const found = getStoredMatchGameById(matchGameId)
            if (!found) {
                setIsNotFound(true)
                return
            }
            setMatchGame(found)

            const memberRecords = getMembersByClubId(clubId)
            const memberUsers = memberRecords
                .map((m) => getUserById(m.userId))
                .filter((u): u is User => u !== undefined)
            setMembers(memberUsers)
        })
    }, [clubId, matchGameId])

    if (isNotFound) {
        return (
            <div className="text-center py-16">
                <p className="text-sm text-muted-foreground">대진표를 찾을 수 없습니다.</p>
            </div>
        )
    }

    if (!matchGame) {
        return (
            <div className="text-center py-16">
                <p className="text-sm text-muted-foreground">불러오는 중...</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold">{matchGame.name}</h1>
                <p className="text-sm text-muted-foreground mt-1">{matchGame.date}</p>
            </div>
            <MatchGameTable
                matchGame={matchGame}
                members={members}
            />
        </div>
    )
}

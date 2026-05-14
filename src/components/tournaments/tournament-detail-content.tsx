'use client'

import { useState, useEffect } from 'react'
import { TournamentTable } from '@/components/tournaments/tournament-table'
import { getStoredClubs } from '@/lib/store/club-store'
import { getStoredTournamentById } from '@/lib/store/tournament-store'
import { getMembersByClubId, getMembershipStatus } from '@/lib/store/club-member-store'
import { getCurrentUserId } from '@/lib/store/auth-store'
import { getUserById } from '@/lib/dummy/users'
import type { Tournament, User } from '@/types'

type TournamentDetailContentProps = {
    clubId: string
    tournamentId: string
}

export function TournamentDetailContent({ clubId, tournamentId }: TournamentDetailContentProps) {
    const [tournament, setTournament] = useState<Tournament | null>(null)
    const [members, setMembers] = useState<User[]>([])
    const [isNotFound, setIsNotFound] = useState(false)

    useEffect(() => {
        const userId = getCurrentUserId()
        if (!userId) {
            setIsNotFound(true)
            return
        }

        const club = getStoredClubs().find((c) => c.id === clubId)
        if (!club) {
            setIsNotFound(true)
            return
        }

        const membership = getMembershipStatus(userId, clubId)
        if (membership !== 'approved') {
            setIsNotFound(true)
            return
        }

        const found = getStoredTournamentById(tournamentId)
        if (!found) {
            setIsNotFound(true)
            return
        }
        setTournament(found)

        const memberRecords = getMembersByClubId(clubId)
        const memberUsers = memberRecords
            .map((m) => getUserById(m.userId))
            .filter((u): u is User => u !== undefined)
        setMembers(memberUsers)
    }, [clubId, tournamentId])

    if (isNotFound) {
        return (
            <div className="text-center py-16">
                <p className="text-sm text-muted-foreground">대진표를 찾을 수 없습니다.</p>
            </div>
        )
    }

    if (!tournament) {
        return (
            <div className="text-center py-16">
                <p className="text-sm text-muted-foreground">불러오는 중...</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold">{tournament.name}</h1>
                <p className="text-sm text-muted-foreground mt-1">{tournament.date}</p>
            </div>
            <TournamentTable
                tournament={tournament}
                members={members}
            />
        </div>
    )
}

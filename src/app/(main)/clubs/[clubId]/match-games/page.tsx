import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchClubById, fetchMyClubs, fetchMyMembership } from '@/lib/queries/clubs'
import { fetchMatchGamesByClubId, fetchClubMembersWithGuests } from '@/lib/queries/match-games'
import { MatchGamesPageContent } from '@/components/match-games/match-games-page-content'

type MatchGamesPageProps = {
    params: Promise<{ clubId: string }>
}

export default async function MatchGamesPage({ params }: MatchGamesPageProps) {
    const { clubId } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const [club, membership, matchGames, members, myClubs] = await Promise.all([
        fetchClubById(clubId),
        fetchMyMembership(user.id, clubId),
        fetchMatchGamesByClubId(clubId),
        fetchClubMembersWithGuests(clubId),
        fetchMyClubs(user.id),
    ])

    const isMember = membership?.status === 'approved'

    return (
        <MatchGamesPageContent
            clubId={clubId}
            club={club}
            matchGames={matchGames}
            members={members}
            isMember={isMember}
            myClubs={myClubs}
        />
    )
}

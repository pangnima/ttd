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
    const isOwner = membership?.role === 'owner'

    // 현재 클럽이 내 클럽 목록에 없으면 ClubSelector에 UUID가 표시되므로 병합
    const isInMyClubs = myClubs.some(c => c.id === clubId)
    const clubsForSelector = isInMyClubs
        ? myClubs
        : club
            ? [club, ...myClubs]
            : myClubs

    return (
        <MatchGamesPageContent
            clubId={clubId}
            club={club}
            matchGames={matchGames}
            members={members}
            isMember={isMember}
            myClubs={clubsForSelector}
            isOwner={isOwner ?? false}
        />
    )
}

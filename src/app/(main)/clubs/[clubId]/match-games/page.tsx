import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchClubById, fetchMyMembership } from '@/lib/queries/clubs'
import { fetchMatchGamesByClubId, fetchClubMembersWithGuests } from '@/lib/queries/match-games'
import { augmentWithFormerMembers } from '@/lib/match-games/former-members'
import { MatchGamesPageContent } from '@/components/match-games/match-games-page-content'

type MatchGamesPageProps = {
    params: Promise<{ clubId: string }>
}

export default async function MatchGamesPage({ params }: MatchGamesPageProps) {
    const { clubId } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const [club, membership, matchGames, members] = await Promise.all([
        fetchClubById(clubId),
        fetchMyMembership(user.id, clubId),
        fetchMatchGamesByClubId(clubId),
        fetchClubMembersWithGuests(clubId),
    ])

    const isMember = membership?.status === 'approved'
    const isOwner = membership?.role === 'owner'

    // 탈퇴(클럽/계정) 선수 이름 복원 — 모든 대진표의 경기에 등장한 선수를 보강한다.
    const { members: membersWithFormer, formerMemberIds } = await augmentWithFormerMembers(
        members,
        matchGames.flatMap((mg) => mg.matches),
    )

    return (
        <MatchGamesPageContent
            clubId={clubId}
            club={club}
            matchGames={matchGames}
            members={membersWithFormer}
            formerMemberIds={formerMemberIds}
            isMember={isMember}
            isOwner={isOwner ?? false}
            currentUserId={user.id}
        />
    )
}

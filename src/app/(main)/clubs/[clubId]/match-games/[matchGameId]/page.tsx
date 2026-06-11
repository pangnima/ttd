import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchMyMembership } from '@/lib/queries/clubs'
import { fetchMatchGameById, fetchClubMembersWithGuests } from '@/lib/queries/match-games'
import { fetchRatingDeltasByMatchGameId } from '@/lib/queries/ratings'
import { MatchGameDetailContent } from '@/components/match-games/match-game-detail-content'

type MatchGameDetailPageProps = {
    params: Promise<{ clubId: string; matchGameId: string }>
}

export default async function MatchGameDetailPage({ params }: MatchGameDetailPageProps) {
    const { clubId, matchGameId } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const [membership, matchGame, members] = await Promise.all([
        fetchMyMembership(user.id, clubId),
        fetchMatchGameById(matchGameId),
        fetchClubMembersWithGuests(clubId),
    ])

    if (membership?.status !== 'approved') redirect(`/clubs/${clubId}`)
    if (!matchGame) notFound()

    const isOwner = membership?.role === 'owner'

    // 확정 대진표만 레이팅 변동(▲/▼·요약) 표시.
    const { byMatch, byUserTotal } = matchGame.isFixed
        ? await fetchRatingDeltasByMatchGameId(matchGame.matches.map((m) => m.id))
        : { byMatch: undefined, byUserTotal: undefined }

    return (
        <MatchGameDetailContent
            matchGame={matchGame}
            members={members}
            isOwner={isOwner}
            ratingDeltaByMatch={byMatch}
            ratingChangeTotals={byUserTotal}
            currentUserId={user.id}
        />
    )
}

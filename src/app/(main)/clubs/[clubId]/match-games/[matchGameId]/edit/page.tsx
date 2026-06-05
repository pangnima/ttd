import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchMatchGameById, fetchClubMembersWithGuests } from '@/lib/queries/match-games'
import { MatchGameCreateForm } from '@/components/match-games/match-game-create-form'
import { PageContainer } from '@/components/common/page-container'

type Props = { params: Promise<{ clubId: string; matchGameId: string }> }

export default async function MatchGameEditPage({ params }: Props) {
    const { clubId, matchGameId } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: membership } = await supabase
        .from('club_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('club_id', clubId)
        .eq('status', 'approved')
        .maybeSingle()

    if (!membership) redirect(`/clubs/${clubId}/match-games/${matchGameId}`)

    const matchGame = await fetchMatchGameById(matchGameId)
    if (!matchGame) notFound()

    const canEdit = !matchGame.isFixed || membership.role === 'owner'
    if (!canEdit) redirect(`/clubs/${clubId}/match-games/${matchGameId}`)

    const members = await fetchClubMembersWithGuests(clubId)

    return (
        <PageContainer>
            <h1 className="text-2xl font-bold">대진표 수정</h1>
            <MatchGameCreateForm clubId={clubId} members={members} initialData={matchGame} />
        </PageContainer>
    )
}

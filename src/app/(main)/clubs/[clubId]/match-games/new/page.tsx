import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchMyMembership } from '@/lib/queries/clubs'
import { fetchClubMembersWithGuests } from '@/lib/queries/match-games'
import { MatchGameCreateForm } from '@/components/match-games/match-game-create-form'

type NewMatchGamePageProps = {
    params: Promise<{ clubId: string }>
}

export default async function NewMatchGamePage({ params }: NewMatchGamePageProps) {
    const { clubId } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const membership = await fetchMyMembership(user.id, clubId)
    if (membership?.status !== 'approved') redirect(`/clubs/${clubId}`)

    const members = await fetchClubMembersWithGuests(clubId)

    return (
        <div className="w-full">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">대진표 작성</h1>
            </div>
            <MatchGameCreateForm clubId={clubId} members={members} />
        </div>
    )
}

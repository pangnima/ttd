import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchUserById } from '@/lib/queries/users'
import { fetchClubById } from '@/lib/queries/clubs'
import { fetchPlayerStatsBundle } from '@/lib/queries/player-profile'
import { MemberProfileHeader } from '@/components/profile/member-profile-header'
import { PlayerStatsSection } from '@/components/profile/player-stats-section'

type Props = {
    params: Promise<{ userId: string }>
    searchParams: Promise<{ clubId?: string }>
}

export default async function MemberProfilePage({ params, searchParams }: Props) {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) redirect('/login')

    const { userId } = await params
    const { clubId } = await searchParams

    const [target, club] = await Promise.all([
        fetchUserById(userId),
        clubId ? fetchClubById(clubId) : Promise.resolve(null),
    ])
    if (!target) notFound()

    const isSelf = authUser.id === userId
    const privacy = target.statsHidden
        ? (isSelf ? 'self' : 'locked')
        : 'public'

    const bundle = await fetchPlayerStatsBundle(userId, clubId)

    return (
        <div className="space-y-6">
            <MemberProfileHeader user={target} clubName={club?.name} />

            <PlayerStatsSection
                bundle={bundle}
                gender={target.gender}
                userId={target.id}
                privacy={privacy}
                editable={isSelf}
                statsHidden={target.statsHidden}
            />
        </div>
    )
}

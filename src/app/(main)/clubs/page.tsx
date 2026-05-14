import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchAllClubs } from '@/lib/queries/clubs'
import { ClubsPageContent } from '@/components/clubs/clubs-page-content'
import type { ClubMember } from '@/types'

export default async function ClubsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const [allClubs, membershipRows] = await Promise.all([
        fetchAllClubs(),
        supabase.from('club_members').select('club_id, status').eq('user_id', user.id),
    ])

    const membershipMap = new Map<string, ClubMember['status']>(
        membershipRows.data?.map((m) => [m.club_id, m.status as ClubMember['status']]) ?? []
    )

    return <ClubsPageContent allClubs={allClubs} membershipMap={membershipMap} />
}

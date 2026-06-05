import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchAllClubs, fetchClubMemberCounts } from '@/lib/queries/clubs'
import { ClubsPageContent } from '@/components/clubs/clubs-page-content'
import type { ClubMember } from '@/types'

export default async function ClubsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const [allClubs, membershipRows] = await Promise.all([
        fetchAllClubs(),
        supabase.from('club_members').select('club_id, status, role').eq('user_id', user.id),
    ])

    const memberCounts = await fetchClubMemberCounts(allClubs.map((c) => c.id))

    const membershipMap = new Map<string, { status: ClubMember['status'], role: ClubMember['role'] }>(
        membershipRows.data?.map((m) => [
            m.club_id,
            { status: m.status as ClubMember['status'], role: m.role as ClubMember['role'] }
        ]) ?? []
    )

    return <ClubsPageContent allClubs={allClubs} membershipMap={membershipMap} memberCounts={memberCounts} />
}

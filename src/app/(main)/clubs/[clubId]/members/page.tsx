import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchClubById, fetchClubMembers, fetchMyMembership } from '@/lib/queries/clubs'
import { MembersContent } from '@/components/clubs/members-content'
import { PageContainer } from '@/components/common/page-container'

type MembersPageProps = {
    params: Promise<{ clubId: string }>
}

export default async function MembersPage({ params }: MembersPageProps) {
    const { clubId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const [club, approvedMembers, pendingMembers, myMembership] = await Promise.all([
        fetchClubById(clubId),
        fetchClubMembers(clubId, 'approved'),
        fetchClubMembers(clubId, 'pending'),
        fetchMyMembership(user.id, clubId),
    ])

    const currentUserRole = myMembership?.role ?? null

    return (
        <PageContainer>
            <MembersContent
                clubId={clubId}
                clubName={club?.name ?? ''}
                members={approvedMembers}
                pendingMembers={pendingMembers}
                currentUserRole={currentUserRole}
            />
        </PageContainer>
    )
}

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
    getDummyClub,
    getDummyApprovedMembers,
    getDummyPendingClubMembers,
    getDummyMyMembership,
    getDummyClubPlayerRatings,
} from '@/lib/redesign-fixtures/clubs'
import { MembersContent } from '@/components/clubs/members-content'
import { PageContainer } from '@/components/common/page-container'

type MembersPageProps = {
    params: Promise<{ clubId: string }>
}

// DB 재설계 기간 임시: UI 작업은 더미데이터로, 실제 Supabase 연동은 이후 별도 진행.
export default async function MembersPage({ params }: MembersPageProps) {
    const { clubId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const club = getDummyClub(clubId)
    const approvedMembers = getDummyApprovedMembers(clubId)
    const pendingMembers = getDummyPendingClubMembers(clubId)
    const myMembership = getDummyMyMembership()
    const clubRatings = getDummyClubPlayerRatings()

    const currentUserRole = myMembership?.role ?? null

    return (
        <PageContainer>
            <MembersContent
                clubId={clubId}
                clubName={club?.name ?? ''}
                members={approvedMembers}
                pendingMembers={pendingMembers}
                currentUserRole={currentUserRole}
                clubRatings={clubRatings}
            />
        </PageContainer>
    )
}

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDummyAllClubs, getDummyMemberCounts, getDummyMembershipMap } from '@/lib/redesign-fixtures/clubs'
import { ClubsPageContent } from '@/components/clubs/clubs-page-content'

// DB 재설계 기간 임시: UI 작업은 더미데이터로, 실제 Supabase 연동은 이후 별도 진행.
// docs/redesign/ui-notes-clubs.md 참고.
export default async function ClubsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const allClubs = getDummyAllClubs()
    const memberCounts = getDummyMemberCounts(allClubs.map((c) => c.id))
    const membershipMap = getDummyMembershipMap(allClubs.map((c) => c.id))

    return <ClubsPageContent allClubs={allClubs} membershipMap={membershipMap} memberCounts={memberCounts} />
}

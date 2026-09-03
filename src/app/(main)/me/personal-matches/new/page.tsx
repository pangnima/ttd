import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchOpponentCandidates } from '@/lib/queries/users'
import { fetchPastOpponents, fetchRecentCourtNames } from '@/lib/queries/personal-matches'
import { PersonalMatchForm } from '@/components/personal-matches/personal-match-form'
import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'

export const metadata = { title: '경기 기록 추가' }

export default async function NewPersonalMatchPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const [opponentCandidates, pastOpponents, recentCourtNames] = await Promise.all([
        fetchOpponentCandidates(user.id),
        fetchPastOpponents(user.id),
        fetchRecentCourtNames(user.id),
    ])

    return (
        <PageContainer>
            <PageHeader
                className="mx-auto w-full max-w-2xl lg:max-w-5xl"
                title="경기 기록 추가"
                description="클럽 외부 경기를 직접 입력합니다"
            />
            <PersonalMatchForm opponentCandidates={opponentCandidates} pastOpponents={pastOpponents} recentCourtNames={recentCourtNames} selfUserId={user.id} />
        </PageContainer>
    )
}

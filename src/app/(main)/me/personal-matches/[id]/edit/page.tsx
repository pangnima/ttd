import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchPersonalMatchById, fetchPastOpponents } from '@/lib/queries/personal-matches'
import { fetchOpponentCandidates } from '@/lib/queries/users'
import { PersonalMatchForm } from '@/components/personal-matches/personal-match-form'
import { SECTION_LABEL } from '@/lib/dashboard/tokens'
import { PageContainer } from '@/components/common/page-container'

type Props = { params: Promise<{ id: string }> }

export const metadata = { title: '경기 기록 수정' }

export default async function EditPersonalMatchPage({ params }: Props) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { id } = await params
    const [match, opponentCandidates, pastOpponents] = await Promise.all([
        fetchPersonalMatchById(id),
        fetchOpponentCandidates(user.id),
        fetchPastOpponents(user.id),
    ])
    if (!match || match.userId !== user.id) notFound()

    return (
        <PageContainer>
            <div className="mx-auto w-full max-w-2xl">
                <h1 className={`${SECTION_LABEL} text-2xl`}>경기 기록 수정</h1>
                <p className="text-sm text-foreground/60 mt-1">vs {match.opponentName}</p>
            </div>
            <PersonalMatchForm initialData={match} opponentCandidates={opponentCandidates} pastOpponents={pastOpponents} />
        </PageContainer>
    )
}

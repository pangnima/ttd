import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchPersonalMatchById, fetchPastOpponents } from '@/lib/queries/personal-matches'
import { fetchOpponentCandidates } from '@/lib/queries/users'
import { PersonalMatchForm } from '@/components/personal-matches/personal-match-form'
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
    // 상호 확인으로 확정된 경기는 수정 불가 (액션·RLS와 삼중 방어)
    if (match.sourceRequestId) redirect('/me/personal-matches')

    return (
        <PageContainer>
            <div className="mx-auto w-full max-w-2xl lg:max-w-5xl">
                <h1 className="text-2xl font-bold">경기 기록 수정</h1>
                <p className="text-sm text-muted-foreground mt-1">vs {match.opponentName}</p>
            </div>
            <PersonalMatchForm initialData={match} opponentCandidates={opponentCandidates} pastOpponents={pastOpponents} />
        </PageContainer>
    )
}

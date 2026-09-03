import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
// 재설계 Step2c: DB 연동 대신 더미 픽스처 사용 (UI 작업 완료 후 실제 쿼리로 복원 예정)
import { dummyPersonalMatches, dummyOpponentCandidates, dummyPastOpponents } from '@/lib/redesign-fixtures/personal-matches'
import { PersonalMatchForm } from '@/components/personal-matches/personal-match-form'
import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'

type Props = { params: Promise<{ id: string }> }

export const metadata = { title: '경기 기록 수정' }

export default async function EditPersonalMatchPage({ params }: Props) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { id } = await params
    const match = dummyPersonalMatches.find((m) => m.id === id) ?? null
    const opponentCandidates = dummyOpponentCandidates
    const pastOpponents = dummyPastOpponents
    if (!match) notFound()
    // 상호 확인으로 확정된 경기는 수정 불가 (액션·RLS와 삼중 방어)
    if (match.sourceRequestId) redirect('/me/personal-matches')

    return (
        <PageContainer>
            <PageHeader
                className="mx-auto w-full max-w-2xl lg:max-w-5xl"
                title="경기 기록 수정"
                description={`vs ${match.opponentName}`}
            />
            <PersonalMatchForm initialData={match} opponentCandidates={opponentCandidates} pastOpponents={pastOpponents} />
        </PageContainer>
    )
}

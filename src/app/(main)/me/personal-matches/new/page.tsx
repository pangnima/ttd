import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
// 재설계 Step2c: DB 연동 대신 더미 픽스처 사용 (UI 작업 완료 후 실제 쿼리로 복원 예정)
import { dummyOpponentCandidates, dummyPastOpponents } from '@/lib/redesign-fixtures/personal-matches'
import { PersonalMatchForm } from '@/components/personal-matches/personal-match-form'
import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'

export const metadata = { title: '경기 기록 추가' }

export default async function NewPersonalMatchPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const opponentCandidates = dummyOpponentCandidates
    const pastOpponents = dummyPastOpponents

    return (
        <PageContainer>
            <PageHeader
                className="mx-auto w-full max-w-2xl lg:max-w-5xl"
                title="경기 기록 추가"
                description="클럽 외부 경기를 직접 입력합니다"
            />
            <PersonalMatchForm opponentCandidates={opponentCandidates} pastOpponents={pastOpponents} selfUserId={user.id} />
        </PageContainer>
    )
}

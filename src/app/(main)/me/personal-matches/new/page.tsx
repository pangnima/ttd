import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
// 재설계 Step2c: DB 연동 대신 더미 픽스처 사용 (UI 작업 완료 후 실제 쿼리로 복원 예정)
import { dummyOpponentCandidates, dummyPastOpponents } from '@/lib/redesign-fixtures/personal-matches'
import { PersonalMatchForm } from '@/components/personal-matches/personal-match-form'
import { PageContainer } from '@/components/common/page-container'

export const metadata = { title: '경기 기록 추가' }

export default async function NewPersonalMatchPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const opponentCandidates = dummyOpponentCandidates
    const pastOpponents = dummyPastOpponents

    return (
        <PageContainer>
            <div className="mx-auto w-full max-w-2xl lg:max-w-5xl">
                <h1 className="text-2xl font-bold">경기 기록 추가</h1>
                <p className="text-sm text-muted-foreground mt-1">클럽 외부 경기를 직접 입력합니다</p>
            </div>
            <PersonalMatchForm opponentCandidates={opponentCandidates} pastOpponents={pastOpponents} selfUserId={user.id} />
        </PageContainer>
    )
}

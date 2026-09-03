// DB 재설계(Step2b) 임시 더미 데이터 스캐폴드 — 실제 Supabase 연동은 재설계 완료 후 복원한다.
import { MatchGameCreateForm } from '@/components/match-games/match-game-create-form'
import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'
import { FIXTURE_MEMBERS } from '@/lib/redesign-fixtures/match-games'

type NewMatchGamePageProps = {
    params: Promise<{ clubId: string }>
}

export default async function NewMatchGamePage({ params }: NewMatchGamePageProps) {
    const { clubId } = await params

    const members = FIXTURE_MEMBERS

    return (
        <PageContainer>
            <PageHeader title="대진표 작성" />
            <MatchGameCreateForm clubId={clubId} members={members} />
        </PageContainer>
    )
}

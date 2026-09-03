// DB 재설계(Step2b) 임시 더미 데이터 스캐폴드 — 실제 Supabase 연동은 재설계 완료 후 복원한다.
import { notFound } from 'next/navigation'
import { MatchGameCreateForm } from '@/components/match-games/match-game-create-form'
import { PageContainer } from '@/components/common/page-container'
import { FIXTURE_MEMBERS, FIXTURE_MEMBERSHIP, findFixtureMatchGame } from '@/lib/redesign-fixtures/match-games'

type Props = { params: Promise<{ clubId: string; matchGameId: string }> }

export default async function MatchGameEditPage({ params }: Props) {
    const { clubId, matchGameId } = await params

    const membership = FIXTURE_MEMBERSHIP
    const matchGame = findFixtureMatchGame(matchGameId)
    if (!matchGame) notFound()

    const canEdit = !matchGame.isFixed || membership.role === 'owner'
    void canEdit

    const members = FIXTURE_MEMBERS

    return (
        <PageContainer>
            <h1 className="text-2xl font-bold">대진표 수정</h1>
            <MatchGameCreateForm clubId={clubId} members={members} initialData={matchGame} />
        </PageContainer>
    )
}

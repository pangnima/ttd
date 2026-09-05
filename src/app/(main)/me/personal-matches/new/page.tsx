import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchOpponentCandidates } from '@/lib/queries/users'
import { fetchPastOpponents, fetchRecentCourtNames } from '@/lib/queries/personal-matches'
import { PersonalMatchForm } from '@/components/personal-matches/personal-match-form'
import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'

export const metadata = { title: '경기 기록 추가' }

type Props = { searchParams: Promise<{ room?: string }> }

export default async function NewPersonalMatchPage({ searchParams }: Props) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // 방 게임 입력은 매칭 룸 안 다이얼로그로 옮겼다(0049 이후 참가자 전원이 룸에서 등록한다).
    // 라우트를 없애지 않는 이유: 기존 북마크·뒤로가기·외부 링크가 404 대신 룸에 착지하도록.
    const { room } = await searchParams
    if (room) redirect(`/match-rooms/${room}`)

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
            <PersonalMatchForm
                opponentCandidates={opponentCandidates}
                pastOpponents={pastOpponents}
                recentCourtNames={recentCourtNames}
                selfUserId={user.id}
            />
        </PageContainer>
    )
}

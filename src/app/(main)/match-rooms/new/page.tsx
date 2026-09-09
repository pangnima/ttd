import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchOpponentCandidates } from '@/lib/queries/users'
import { fetchRecentCourtNames } from '@/lib/queries/personal-matches'
import { MatchRoomForm } from '@/components/match-rooms/match-room-form'
import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'

export const metadata = { title: '매칭 만들기' }

/**
 * 매칭 만들기 — 경기 전에 방을 연다(Week 39).
 * 만들면 곧바로 매칭 리스트에 오르고, 지목한 상대에게는 초대가 간다.
 */
export default async function NewMatchRoomPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const [opponentCandidates, recentCourtNames] = await Promise.all([
        fetchOpponentCandidates(user.id),
        fetchRecentCourtNames(user.id),
    ])

    return (
        <PageContainer>
            <PageHeader
                className="mx-auto w-full max-w-2xl"
                title="매칭 만들기"
                description="경기 전에 매칭을 열어 두면 매칭 리스트에 올라갑니다. 대진과 결과는 매칭 룸 안에서 정리합니다"
            />
            <MatchRoomForm
                selfUserId={user.id}
                opponentCandidates={opponentCandidates}
                recentCourtNames={recentCourtNames}
            />
        </PageContainer>
    )
}

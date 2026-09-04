import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchPersonalMatchById, fetchPastOpponents, fetchRecentCourtNames } from '@/lib/queries/personal-matches'
import { fetchOpponentCandidates } from '@/lib/queries/users'
import { fetchRoomParticipantCandidates } from '@/lib/queries/match-rooms'
import { formatTeams } from '@/lib/personal-matches/labels'
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
    const [match, opponentCandidates, pastOpponents, recentCourtNames] = await Promise.all([
        fetchPersonalMatchById(id),
        fetchOpponentCandidates(user.id),
        fetchPastOpponents(user.id),
        fetchRecentCourtNames(user.id),
    ])
    if (!match || match.userId !== user.id) notFound()
    // 상호 확인으로 확정된 경기는 수정 불가 (액션·RLS와 삼중 방어)
    if (match.sourceRequestId) redirect('/me/personal-matches')
    // 경기 리스트 방의 기록이면 방 참가자를 자동완성 최상단에 — 모집 중인 빈 자리를 들어온 사람으로 채운다(0048)
    const roomParticipants = match.roomId ? await fetchRoomParticipantCandidates(match.roomId, user.id) : undefined

    return (
        <PageContainer>
            <PageHeader
                className="mx-auto w-full max-w-2xl lg:max-w-5xl"
                title="경기 기록 수정"
                description={formatTeams(match)}
            />
            {/* selfUserId — 모집형(리스트에 노출·결과 없음) 기록의 빈 자리를 전체 회원 검색으로 채울 수 있게 한다 */}
            <PersonalMatchForm
                initialData={match}
                opponentCandidates={opponentCandidates}
                pastOpponents={pastOpponents}
                recentCourtNames={recentCourtNames}
                selfUserId={user.id}
                roomParticipants={roomParticipants}
            />
        </PageContainer>
    )
}

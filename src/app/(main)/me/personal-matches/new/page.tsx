import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchOpponentCandidates } from '@/lib/queries/users'
import { fetchPastOpponents, fetchRecentCourtNames } from '@/lib/queries/personal-matches'
import { fetchMatchRoomDetail, fetchRoomParticipantCandidates } from '@/lib/queries/match-rooms'
import { buildRoomGameContext, canAddRoomGame, type RoomGameContext } from '@/lib/match-rooms/room-context'
import { buildRoomTitle } from '@/lib/match-rooms/title'
import { PersonalMatchForm } from '@/components/personal-matches/personal-match-form'
import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'

export const metadata = { title: '경기 기록 추가' }

type Props = { searchParams: Promise<{ room?: string }> }

/**
 * 방 게임 추가 컨텍스트(0048) — ?room=<id>로 열면 방장만 그 방의 게임을 붙일 수 있다.
 * 방장이 아니거나 게임을 붙일 수 없는 방(확인 요청·미확정 로테이션)이면 방 상세로 돌려보낸다.
 */
async function loadRoomContext(roomId: string, userId: string): Promise<RoomGameContext> {
    const detail = await fetchMatchRoomDetail(roomId)
    if (!detail || detail.room.hostUserId !== userId || !canAddRoomGame(detail)) redirect(`/match-rooms/${roomId}`)
    const participants = await fetchRoomParticipantCandidates(roomId, userId)
    return buildRoomGameContext(detail, participants)
}

export default async function NewPersonalMatchPage({ searchParams }: Props) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { room } = await searchParams
    const [opponentCandidates, pastOpponents, recentCourtNames, roomContext] = await Promise.all([
        fetchOpponentCandidates(user.id),
        fetchPastOpponents(user.id),
        fetchRecentCourtNames(user.id),
        room ? loadRoomContext(room, user.id) : Promise.resolve(undefined),
    ])

    return (
        <PageContainer>
            <PageHeader
                className="mx-auto w-full max-w-2xl lg:max-w-5xl"
                title={roomContext ? '게임 추가' : '경기 기록 추가'}
                description={roomContext ? `${buildRoomTitle(roomContext)} 방에 게임을 추가합니다` : '클럽 외부 경기를 직접 입력합니다'}
            />
            <PersonalMatchForm
                opponentCandidates={opponentCandidates}
                pastOpponents={pastOpponents}
                recentCourtNames={recentCourtNames}
                selfUserId={user.id}
                roomContext={roomContext}
            />
        </PageContainer>
    )
}

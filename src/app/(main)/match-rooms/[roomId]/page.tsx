import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
    fetchMatchRoomDetail, fetchMatchRoomSummary, fetchRoomGameConfirmations, fetchRoomParticipantCandidates,
} from '@/lib/queries/match-rooms'
import { fetchRoomRotationSession } from '@/lib/queries/rotation-sessions'
import { fetchOpponentCandidates } from '@/lib/queries/users'
import { fetchPastOpponents } from '@/lib/queries/personal-matches'
import { buildRoomGameContext, canViewerAddRoomGame } from '@/lib/match-rooms/room-context'
import { buildRoomTitle } from '@/lib/match-rooms/title'
import { formatHeadcount } from '@/lib/match-rooms/headcount'
import { PageHeader } from '@/components/common/page-header'
import { PageContainer } from '@/components/common/page-container'
import { RoomPasswordGate } from '@/components/match-rooms/room-password-gate'
import { RoomDetailHeader } from '@/components/match-rooms/room-detail-header'
import { RoomInviteBanner } from '@/components/match-rooms/room-invite-banner'
import { RoomMembersSection } from '@/components/match-rooms/room-members-section'
import { RoomGamesSection } from '@/components/match-rooms/room-games-section'
import { RoomHostActions } from '@/components/match-rooms/room-host-actions'

export const metadata = { title: '매칭 룸' }

type Props = { params: Promise<{ roomId: string }> }

/**
 * 매칭 룸 상세 — 멤버(방장·초대 수락자·비밀번호 입장자)면 참가자·게임, 아니면 공개 메타 + 비밀번호 게이트.
 * 멤버십 판정은 get_match_room_detail RPC가 하고, 게이트 통과(enter_match_room = 참가) 후 router.refresh로 다시 그린다.
 */
export default async function MatchRoomPage({ params }: Props) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { roomId } = await params
    const detail = await fetchMatchRoomDetail(roomId)

    if (!detail) {
        const summary = await fetchMatchRoomSummary(roomId, user.id)
        if (!summary) notFound()
        return (
            <PageContainer>
                <PageHeader
                    title={buildRoomTitle(summary)}
                    description={`방장 ${summary.host.name} · ${formatHeadcount(summary.joinedCount)}`}
                />
                <RoomPasswordGate roomId={roomId} />
            </PageContainer>
        )
    }

    const isHost = detail.room.hostUserId === user.id
    const isMember = isHost || detail.viewer?.status === 'joined'
    const canAdd = canViewerAddRoomGame(detail, user.id)
    const isPendingRotation = detail.source.kind === 'rotation' && !detail.source.isFinalized
    // 게임 추가 폼과 로테이션 빌더가 같은 참가자 명단·자동완성 후보를 쓰므로 한 번만 조회한다
    const needsPicker = canAdd || (isMember && isPendingRotation)
    const requestIds = detail.games.map((g) => g.sourceRequestId).filter((id): id is string => !!id)

    const [participants, opponentCandidates, pastOpponents, confirmations, rotationSession] = await Promise.all([
        needsPicker ? fetchRoomParticipantCandidates(roomId, user.id) : [],
        needsPicker ? fetchOpponentCandidates(user.id) : [],
        needsPicker ? fetchPastOpponents(user.id) : [],
        // 협상 행이 오는 게임 = 내가 결과를 입력·확인할 수 있는 게임 (RLS가 당사자만 통과시킨다)
        fetchRoomGameConfirmations(requestIds, user.id),
        isMember && isPendingRotation ? fetchRoomRotationSession(roomId) : null,
    ])
    const gameCtx = canAdd ? buildRoomGameContext(detail, participants, user.id) : undefined
    const picker = needsPicker ? { candidates: opponentCandidates, pastOpponents, selfUserId: user.id } : undefined

    // 미확정 로테이션 방은 참가자 전원이 각자 게임을 넣는 중 — 세션을 닫는 건 방장만 한다(0050)
    const canCloseRotation = detail.source.kind === 'rotation' && !detail.source.isFinalized

    return (
        <PageContainer>
            <RoomDetailHeader
                detail={detail}
                actions={isHost ? <RoomHostActions roomId={roomId} canCloseRotation={canCloseRotation} /> : undefined}
            />
            {detail.viewer?.status === 'invited' && <RoomInviteBanner roomId={roomId} />}
            <RoomMembersSection detail={detail} />
            <RoomGamesSection
                detail={detail}
                viewerId={user.id}
                gameCtx={gameCtx}
                opponentCandidates={opponentCandidates}
                pastOpponents={pastOpponents}
                confirmations={confirmations}
                rotationSession={rotationSession}
                participants={participants}
                picker={picker}
            />
        </PageContainer>
    )
}

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchMatchRoomDetail, fetchMatchRoomSummary } from '@/lib/queries/match-rooms'
import { fetchRoomDetailExtras } from '@/lib/queries/room-detail-extras'
import { buildRoomGameContext } from '@/lib/match-rooms/room-context'
import { roomStage } from '@/lib/match-rooms/room-stage'
import { viewerRoomTurn } from '@/lib/match-rooms/room-turn'
import { PageContainer } from '@/components/common/page-container'
import { RoomGateView } from '@/components/match-rooms/room-gate-view'
import { RoomDetailHeader } from '@/components/match-rooms/room-detail-header'
import { RoomInviteBanner } from '@/components/match-rooms/room-invite-banner'
import { RoomRemovedNotice } from '@/components/match-rooms/room-removed-notice'
import { RoomTurnBanner } from '@/components/match-rooms/room-turn-banner'
import { RoomSettledNotice } from '@/components/match-rooms/room-settled-notice'
import { RoomMembersSection } from '@/components/match-rooms/room-members-section'
import { RoomGamesSection } from '@/components/match-rooms/room-games-section'
import { RoomHostActions } from '@/components/match-rooms/room-host-actions'
import { RoomLeaveButton } from '@/components/match-rooms/room-leave-button'

export const metadata = { title: '매칭 룸' }

type Props = { params: Promise<{ roomId: string }> }

/**
 * 매칭 룸 상세 — 하나의 매칭이 시작해서 끝날 때까지의 단일 작업 공간(Week 39).
 * 단계 칩과 「지금 할 일」 배너가 위에서 방향을 잡아 주고, 참가자 초대·대진·결과 입력·확인·이의가
 * 전부 이 화면 안에서 끝난다. 멤버가 아니면 공개 메타 + 비밀번호 게이트만 보인다.
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
        return <RoomGateView roomId={roomId} summary={summary} />
    }

    const x = await fetchRoomDetailExtras(detail, user.id)
    const gameCtx = x.canAdd ? buildRoomGameContext(detail, x.participants) : undefined
    const picker = x.canAdd || (x.isMember && x.isPendingRotation)
        ? { candidates: x.opponentCandidates, pastOpponents: x.pastOpponents, selfUserId: user.id }
        : undefined

    const stage = roomStage(detail)
    const turn = x.isMember ? viewerRoomTurn(detail.games, user.id, x.confirmations) : null

    return (
        <PageContainer>
            <RoomDetailHeader
                detail={detail}
                actions={x.isHost ? <RoomHostActions roomId={roomId} canCloseRotation={x.isPendingRotation} /> : undefined}
            />
            {detail.viewer?.status === 'invited' && <RoomInviteBanner roomId={roomId} />}
            {detail.viewer?.status === 'removed' && <RoomRemovedNotice />}
            {x.isMember && (stage === 'closed' ? <RoomSettledNotice /> : <RoomTurnBanner turn={turn} stage={stage} />)}
            <RoomMembersSection
                detail={detail}
                viewerId={user.id}
                invite={x.isMember ? { selfUserId: user.id, candidates: x.opponentCandidates } : undefined}
                host={x.isHost ? { viewerId: user.id } : undefined}
            />
            <RoomGamesSection
                detail={detail}
                viewerId={user.id}
                gameCtx={gameCtx}
                opponentCandidates={x.opponentCandidates}
                pastOpponents={x.pastOpponents}
                confirmations={x.confirmations}
                rotationSession={x.rotationSession}
                participants={x.participants}
                picker={picker}
                sessionGames={x.sessionGames}
                lineupCandidates={x.isHost ? x.lineupCandidates : undefined}
            />
            {/* 방장은 나갈 수 없다 — '매칭 리스트에서 내리기'가 방장의 퇴장이다(0054) */}
            {!x.isHost && detail.viewer && detail.viewer.status !== 'declined' && detail.viewer.status !== 'removed' && (
                <RoomLeaveButton roomId={roomId} />
            )}
        </PageContainer>
    )
}

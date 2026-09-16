import { redirect } from 'next/navigation'
import { isViewerJoined } from '@/lib/match-rooms/headcount'
import { createClient } from '@/lib/supabase/server'
import { fetchMatchRoomDetail, fetchMatchRoomSummary } from '@/lib/queries/match-rooms'
import { fetchRoomDetailExtras } from '@/lib/queries/room-detail-extras'
import { buildRoomGameContext } from '@/lib/match-rooms/room-context'
import { isRoomFinished, roomStage } from '@/lib/match-rooms/room-stage'
import { roomGameMemberIds } from '@/lib/match-rooms/game-status'
import { viewerRoomTurn } from '@/lib/match-rooms/room-turn'
import { PageContainer } from '@/components/common/page-container'
import { RoomGateView } from '@/components/match-rooms/room-gate-view'
import { RoomGoneNotice } from '@/components/match-rooms/room-gone-notice'
import { RoomInviteFailedNotice } from '@/components/match-rooms/room-invite-failed-notice'
import { RoomDirectCreatedNotice } from '@/components/match-rooms/room-direct-created-notice'
import { RoomDetailHeader } from '@/components/match-rooms/room-detail-header'
import { RoomInviteBanner } from '@/components/match-rooms/room-invite-banner'
import { RoomTurnBanner } from '@/components/match-rooms/room-turn-banner'
import { RoomSettledNotice } from '@/components/match-rooms/room-settled-notice'
import { RoomMembersSection } from '@/components/match-rooms/room-members-section'
import { RoomGamesSection } from '@/components/match-rooms/room-games-section'
import { RoomHostActions } from '@/components/match-rooms/room-host-actions'
import { RoomLeaveButton } from '@/components/match-rooms/room-leave-button'

export const metadata = { title: '매칭 룸' }

type Props = { params: Promise<{ roomId: string }>; searchParams: Promise<{ notice?: string }> }

/**
 * 매칭 룸 상세 — 하나의 매칭이 시작해서 끝날 때까지의 단일 작업 공간(Week 39).
 * 단계 칩과 「지금 할 일」 배너가 위에서 방향을 잡아 주고, 참가자 초대·대진·결과 입력·확인·이의가
 * 전부 이 화면 안에서 끝난다. 멤버가 아니면 공개 메타 + 비밀번호 게이트만 보인다.
 */
export default async function MatchRoomPage({ params, searchParams }: Props) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const [{ roomId }, { notice }] = await Promise.all([params, searchParams])
    const detail = await fetchMatchRoomDetail(roomId)

    if (!detail) {
        const summary = await fetchMatchRoomSummary(roomId, user.id)
        // 내려간 방은 404가 아니라 매칭 리스트로 돌려보낸다(F-14)
        if (!summary) return <RoomGoneNotice />
        return <RoomGateView roomId={roomId} summary={summary} />
    }

    const x = await fetchRoomDetailExtras(detail, user.id)
    const gameCtx = x.canAdd ? buildRoomGameContext(detail, x.participants) : undefined
    const picker = x.canAdd || (x.isMember && x.isPendingRotation)
        ? { candidates: x.opponentCandidates, pastOpponents: x.pastOpponents, selfUserId: user.id }
        : undefined

    const stage = roomStage(detail)
    // 호스트의 미확정 로테이션 방은 게임을 다 확정해도 세션이 남는다 — 종료 차례를 배너가 말한다(0077)
    const turn = x.isMember
        ? viewerRoomTurn(detail.games, user.id, x.confirmations, { hostOfPendingRotation: x.isHost && x.isPendingRotation })
        : null

    return (
        <PageContainer>
            <RoomDetailHeader
                detail={detail}
                actions={x.isHost
                    ? (
                        <RoomHostActions
                            roomId={roomId}
                            canCloseRotation={x.isPendingRotation && detail.games.length > 0}
                            isListed={detail.room.isListed}
                            isSettled={detail.room.isSettled}
                            closedAt={detail.room.closedAt}
                        />
                    )
                    : undefined}
            />
            {notice === 'invite_failed' && <RoomInviteFailedNotice />}
            {notice === 'direct_room' && <RoomDirectCreatedNotice />}
            {detail.viewer?.status === 'invited' && <RoomInviteBanner roomId={roomId} />}
            {x.isMember && (isRoomFinished(stage)
                ? <RoomSettledNotice closed={stage === 'closed'} isHost={x.isHost} />
                : <RoomTurnBanner turn={turn} stage={stage} />)}
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
                editableLineup={x.isHost ? x.editableLineup : undefined}
            />
            {/* 호스트는 나갈 수 없다 — '매칭 리스트에서 내리기'가 호스트의 퇴장이다(0054).
                경기에 배정된 참가자도 나갈 수 없다(0077) — 강퇴 가드(member_has_games)와 같은 집합을 본다 */}
            {/* 초대 대기(invited)에게는 배너의 [거절]이 같은 행동이라 여기 버튼을 겹쳐 두지 않는다(U-7) */}
            {!x.isHost && isViewerJoined(detail.viewer) && (
                <RoomLeaveButton roomId={roomId} hasGames={roomGameMemberIds(detail.games).has(user.id)} finished={isRoomFinished(stage)} />
            )}
        </PageContainer>
    )
}

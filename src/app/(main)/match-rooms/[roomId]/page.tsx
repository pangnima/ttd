import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchMatchRoomDetail, fetchMatchRoomSummary } from '@/lib/queries/match-rooms'
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

export const metadata = { title: '경기 상세' }

type Props = { params: Promise<{ roomId: string }> }

/**
 * 경기 방 상세 — 멤버(방장·초대 수락자·비밀번호 입장자)면 참가자·게임, 아니면 공개 메타 + 비밀번호 게이트.
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

    return (
        <PageContainer>
            <RoomDetailHeader detail={detail} actions={isHost ? <RoomHostActions roomId={roomId} /> : undefined} />
            {detail.viewer?.status === 'invited' && <RoomInviteBanner roomId={roomId} />}
            <RoomMembersSection detail={detail} />
            <RoomGamesSection detail={detail} viewerId={user.id} />
        </PageContainer>
    )
}

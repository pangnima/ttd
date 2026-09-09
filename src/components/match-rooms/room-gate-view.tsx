import type { MatchRoomSummary } from '@/types'
import { buildRoomTitle } from '@/lib/match-rooms/title'
import { formatHeadcount } from '@/lib/match-rooms/headcount'
import { PageHeader } from '@/components/common/page-header'
import { PageContainer } from '@/components/common/page-container'
import { RoomPasswordGate } from '@/components/match-rooms/room-password-gate'

type Props = { roomId: string; summary: MatchRoomSummary }

/**
 * 아직 방에 들어오지 않은 사람에게 보이는 화면 — 공개 메타 + 비밀번호 게이트.
 * 초대받은 사람(invited)은 여기까지 오지 않는다: get_match_room_detail이 상세를 내주므로
 * 룸 안에서 [참가 수락]만 누르면 된다(비밀번호 불필요).
 */
export function RoomGateView({ roomId, summary }: Props) {
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

import type { MatchRoomSummary } from '@/types'
import { buildRoomTitle } from '@/lib/match-rooms/title'
import { formatHeadcount } from '@/lib/match-rooms/headcount'
import { PageHeader } from '@/components/common/page-header'
import { PageContainer } from '@/components/common/page-container'
import { RoomPasswordGate } from '@/components/match-rooms/room-password-gate'
import { RoomRemovedNotice } from '@/components/match-rooms/room-removed-notice'
import { RoomUnlistedNotice } from '@/components/match-rooms/room-unlisted-notice'
import { HOST_LABEL } from '@/lib/match-rooms/member-labels'

type Props = { roomId: string; summary: MatchRoomSummary }

/**
 * 아직 방에 들어오지 않은 사람에게 보이는 화면 — 공개 메타 + 비밀번호 게이트.
 * 초대받은 사람(invited)은 여기까지 오지 않는다: get_match_room_detail이 상세를 내주므로
 * 룸 안에서 [참가 수락]만 누르면 된다(비밀번호 불필요).
 *
 * 내보내진 사람(removed)은 0070부터 여기로 온다 — 비밀번호를 넣어도 막히므로 입력창 대신
 * 이유를 말한다. 나간 사람(declined)에게는 종전대로 게이트를 보여준다(다시 들어올 수 있다).
 * 비노출 방(0082)에는 비밀번호 자체가 없다 — 초대로만 들어온다고 말한다.
 */
export function RoomGateView({ roomId, summary }: Props) {
    const removed = summary.viewer?.status === 'removed'
    return (
        <PageContainer>
            <PageHeader
                title={buildRoomTitle(summary)}
                description={`${HOST_LABEL} ${summary.host.name} · ${formatHeadcount(summary.joinedCount)}`}
            />
            {removed ? <RoomRemovedNotice /> : !summary.isListed ? <RoomUnlistedNotice /> : <RoomPasswordGate roomId={roomId} />}
        </PageContainer>
    )
}

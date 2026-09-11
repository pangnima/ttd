import type { MatchRoomInvite } from '@/types'
import { CARD_BASE, TYPO } from '@/lib/dashboard/tokens'
import { RoomInviteCard } from '@/components/match-rooms/room-invite-card'

type Props = { invites: MatchRoomInvite[] }

/**
 * 「나를 초대한 매칭」 — 목록 최상단(Week 39).
 *
 * 「참여 중인 매칭」의 2탭(진행 중/종료된)은 시간 축이라 "아직 응답하지 않은 초대"가 낄 자리가 없다.
 * 탭을 늘리는 대신 목록 위에 얹는다 — 초대는 고르는 것이 아니라 답해야 하는 것이라 탭 뒤에 숨으면 안 된다.
 * 수락하면 비밀번호 없이 참가자가 되고, 이 섹션에서 사라져 아래 목록으로 내려간다.
 */
export function RoomInvitesSection({ invites }: Props) {
    if (invites.length === 0) return null

    return (
        <section className="space-y-2">
            <div className="flex items-baseline gap-2">
                <h2 className={TYPO.h3}>나를 초대한 매칭</h2>
                <span className="text-caption text-muted-foreground tabular-nums">{invites.length}</span>
            </div>
            <div className={`${CARD_BASE} divide-y divide-border border-spot/40`}>
                {invites.map((invite) => <RoomInviteCard key={invite.roomId} invite={invite} />)}
            </div>
        </section>
    )
}

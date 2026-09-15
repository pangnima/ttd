import { CARD_BASE, TYPO } from '@/lib/dashboard/tokens'
import { GUIDE_INVITE, GUIDE_MY_ROOM, GUIDE_ROOM_TURN } from '@/lib/guide/fixtures'
import { GuideExample } from '@/components/guide/guide-example'
import { MatchRoomCard } from '@/components/match-rooms/match-room-card'
import { RoomInviteCard } from '@/components/match-rooms/room-invite-card'

/**
 * 참여 중인 매칭 화면의 두 덩어리 — 「나를 초대한 매칭」 카드와 내 차례 필이 붙은 내 매칭 카드.
 * 섹션 제목은 헤딩 태그 없이 eyebrow로 — 예시 안에 h2가 생기면 문서 아웃라인이 지저분해진다.
 */
export function RoomInviteExample() {
    return (
        <GuideExample caption="초대 카드의 **참가 수락**을 누르면 비밀번호 없이 참가자가 되고, 아래 카드의 **결과 확인** 표시가 내 차례를 말합니다.">
            <div className="space-y-4">
                <section className="space-y-2">
                    <p className={TYPO.eyebrow}>나를 초대한 매칭</p>
                    <div className={`${CARD_BASE} divide-y divide-border border-spot/40`}>
                        <RoomInviteCard invite={GUIDE_INVITE} />
                    </div>
                </section>
                <section className="space-y-2">
                    <p className={TYPO.eyebrow}>진행 중</p>
                    <div className={`${CARD_BASE} divide-y divide-border`}>
                        <MatchRoomCard room={GUIDE_MY_ROOM} turn={GUIDE_ROOM_TURN ?? undefined} />
                    </div>
                </section>
            </div>
        </GuideExample>
    )
}

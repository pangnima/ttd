import { LIST_CARD } from '@/lib/dashboard/tokens'
import { GUIDE_LIST_ROOMS, GUIDE_LIST_TURNS } from '@/lib/guide/fixtures'
import { GuideExample } from '@/components/guide/guide-example'
import { MatchRoomCard } from '@/components/match-rooms/match-room-card'

/** 매칭 리스트 카드 두 장 — 실제 목록(`RoomListSection`)과 같은 래퍼·같은 컴포넌트 */
export function MatchRoomCardExample() {
    return (
        <GuideExample caption="위는 아직 들어가지 않은 매칭(**비밀번호 입장**), 아래는 내가 참가해 **결과 입력** 차례가 온 매칭입니다.">
            <div className={`${LIST_CARD}`}>
                {GUIDE_LIST_ROOMS.map((room) => (
                    <MatchRoomCard key={room.id} room={room} turn={GUIDE_LIST_TURNS.get(room.id)} />
                ))}
            </div>
        </GuideExample>
    )
}

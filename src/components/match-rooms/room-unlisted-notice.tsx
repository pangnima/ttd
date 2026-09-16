import { Notice } from '@/components/common/notice'

/**
 * 비노출 방(0082)에 초대받지 않은 사람이 URL로 왔을 때 — 비밀번호 게이트를 대신한다.
 * 이 방에는 비밀번호가 없다(secrets 행이 없다). 입력창을 그리면 "무엇을 넣어야 하나"에서 멈추므로
 * 왜 막혔고 어떻게 들어오는지를 말한다. 서버도 enter_match_room에서 room_not_listed로 막는다.
 */
export function RoomUnlistedNotice() {
    return (
        <Notice title="초대받은 사람만 볼 수 있는 매칭입니다.">
            직접 기록에서 만든 비공개 매칭이라 매칭 리스트에 오르지 않고 비밀번호 입장도 없습니다.
            참가하려면 호스트나 참가자의 초대가 필요합니다.
        </Notice>
    )
}

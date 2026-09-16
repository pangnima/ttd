import { Notice } from '@/components/common/notice'

/**
 * 직접 기록에서 회원을 골라 비노출 방이 막 만들어졌을 때(?notice=direct_room, 0082).
 * 게임은 아직 없다 — 상대가 초대를 수락해야 [게임 추가]·[자동 대진표]가 그 사람을 잡을 수 있으므로
 * (create_room_game은 joined만 받는다) 다음 손이 무엇인지 여기서 말한다.
 */
export function RoomDirectCreatedNotice() {
    return (
        <Notice tone="primary" title="비공개 매칭을 만들고 초대를 보냈습니다.">
            이 매칭은 매칭 리스트에 뜨지 않습니다. 상대가 수락하면 아래 게임 섹션의 [게임 추가]나
            [자동 대진표]로 게임을 만들고, 결과는 여기서 함께 확인합니다.
        </Notice>
    )
}

import { CARD_BASE, TYPO } from '@/lib/dashboard/tokens'

/**
 * 내보내진 사람이 방을 열었을 때의 안내 (0068 → 0070).
 *
 * 0070부터 강퇴자는 방 내용을 볼 수 없다. 그래서 이 자리는 비밀번호 게이트를 대신한다 —
 * 비밀번호를 알아도 막히므로, 입력창 대신 왜 막혔고 어떻게 풀리는지를 말한다.
 * 경기에 배정된 사람은 애초에 내보낼 수 없으므로(member_has_games) 여기서 잃는 확인 권한은 없다.
 */
export function RoomRemovedNotice() {
    return (
        <div className={`${CARD_BASE} px-4 py-3 border-spot/40`}>
            <p className={`${TYPO.body2} font-medium break-keep`}>호스트가 이 매칭에서 회원님을 내보냈습니다.</p>
            <p className={`${TYPO.caption} mt-1 break-keep`}>
                매칭 내용은 더 이상 보이지 않고, 비밀번호를 알아도 입장할 수 없습니다.
                다시 참가하려면 호스트의 초대가 필요합니다.
            </p>
        </div>
    )
}

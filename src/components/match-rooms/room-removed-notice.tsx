import { CARD_BASE, TYPO } from '@/lib/dashboard/tokens'

/**
 * 강퇴당한 사람이 방을 열었을 때의 안내 (0068).
 *
 * 이 안내가 없으면 "왜 버튼이 다 사라졌지?"만 겪는다. 그리고 실제로 할 수 있는 일
 * (이미 뛴 경기의 결과 확인)이 남아 있다는 것을 알려 줘야 그 게임이 확정될 수 있다.
 */
export function RoomRemovedNotice() {
    return (
        <div className={`${CARD_BASE} px-4 py-3 border-spot/40`}>
            <p className={`${TYPO.body2} font-medium break-keep`}>방장이 이 매칭에서 회원님을 내보냈습니다.</p>
            <p className={`${TYPO.caption} mt-1 break-keep`}>
                새 게임을 등록하거나 다시 입장할 수는 없지만, 이미 함께 뛴 경기의 결과를 확인·이의하는 것은 그대로 하실 수 있습니다.
                다시 참가하려면 방장의 초대가 필요합니다.
            </p>
        </div>
    )
}

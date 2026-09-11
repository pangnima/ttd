import { CARD_BASE, TYPO } from '@/lib/dashboard/tokens'

/**
 * 매칭은 만들어졌지만 초대만 실패한 채 룸에 착지했을 때(?notice=invite_failed, E2E F-pre-1).
 * 폼은 roomId가 있으면 곧장 방으로 보내므로 액션이 돌려준 문구가 화면에 닿을 자리가 없었다 —
 * 착지 URL의 쿼리로 전달하고 룸이 그린다.
 */
export function RoomInviteFailedNotice() {
    return (
        <div className={`${CARD_BASE} px-4 py-3 border-spot/40`}>
            <p className={`${TYPO.body2} font-medium break-keep`}>매칭은 만들어졌지만 초대에 실패했습니다.</p>
            <p className={`${TYPO.caption} mt-1 break-keep`}>참가자 섹션의 [회원 초대]에서 다시 불러주세요.</p>
        </div>
    )
}

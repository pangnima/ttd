import { CARD_BASE, TYPO } from '@/lib/dashboard/tokens'

/**
 * 가입 직후 프로필에 한 번 뜨는 완료 신호(`?notice=welcome`, F-pre-4·U-6).
 * 착지가 0경기 프로필이라 배너가 없으면 저장이 됐는지 알 수 없었다 — 아래 체크리스트가 다음 행동을 말한다.
 */
export function WelcomeNotice() {
    return (
        <div className={`${CARD_BASE} px-4 py-3 border-spot/40`}>
            <p className={`${TYPO.body2} font-medium break-keep`}>가입이 완료됐습니다.</p>
            <p className={`${TYPO.caption} mt-1 break-keep`}>아래 체크리스트를 따라 첫 매칭에 참여해 보세요.</p>
        </div>
    )
}

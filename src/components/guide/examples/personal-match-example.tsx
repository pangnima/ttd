import { CARD_BASE } from '@/lib/dashboard/tokens'
import { GUIDE_PERSONAL_MATCH } from '@/lib/guide/fixtures'
import { GuideExample } from '@/components/guide/guide-example'
import { PersonalMatchCard } from '@/components/personal-matches/personal-match-card'

/** 내 경기 결과 카드 한 장 — 매칭에서 확정된 게임이 전적으로 올라온 모습 */
export function PersonalMatchExample() {
    return (
        <GuideExample caption="매칭에서 확정된 경기가 **승** 배지와 스코어를 달고 올라온 카드입니다.">
            <div className={CARD_BASE}>
                <PersonalMatchCard match={GUIDE_PERSONAL_MATCH} />
            </div>
        </GuideExample>
    )
}

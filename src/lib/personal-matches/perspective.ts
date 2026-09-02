import type { PersonalMatchSetScore } from '@/types'

// 애드/듀스 관점 교차: 요청자 관점의 내 팀 애드(me/partner)는 상대 관점에선 상대팀 애드(opponent/opponent2)
const MY_AD_TO_OPP_AD = { me: 'opponent', partner: 'opponent2' } as const
const OPP_AD_TO_MY_AD = { opponent: 'me', opponent2: 'partner' } as const

/**
 * 상호 확인 대진(match_requests)의 스코어는 요청자 관점으로 저장된다.
 * 받은 요청 카드·결과 검토 패널에서 "내 관점" 미리보기를 그릴 때 사용하는 표시 전용 헬퍼 —
 * 실제 저장 반전은 SECURITY DEFINER RPC(invert_set_scores)가 SQL로 동일 규칙으로 수행한다.
 * me↔opp 스왑 + 복식 애드 키가 있으면 교차 반전(키 없으면 추가하지 않음).
 */
export function invertSetScores(sets: PersonalMatchSetScore[]): PersonalMatchSetScore[] {
    return sets.map((s) => {
        const out: PersonalMatchSetScore = { me: s.opp, opp: s.me }
        if (s.oppAd) out.myAd = OPP_AD_TO_MY_AD[s.oppAd]
        if (s.myAd) out.oppAd = MY_AD_TO_OPP_AD[s.myAd]
        return out
    })
}

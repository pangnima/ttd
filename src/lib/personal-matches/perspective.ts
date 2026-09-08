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

/**
 * **내 팀 안쪽** 관점 교차 — 나↔파트너 (SQL `swap_partner_perspective`의 TS 미러, 0049).
 * `invertSetScores`가 팀을 가로지른다면 이쪽은 팀 안에서 자리만 바꾼다:
 * 같은 팀이라 **스코어(me/opp)는 그대로**이고 `myAd`만 뒤집힌다(`oppAd`는 건드리지 않는다).
 *
 * ⚠ 이 파일은 **표시 방향**(요청자 관점 → 보는 사람 관점)만 다룬다. 좌석별 표시 변환은
 *    요청자=그대로 / 파트너=`P` / 대표=`I` / 상대2=`P∘I`라 이 둘이면 전부 덮인다.
 *    제안을 요청자 관점으로 되돌리는 **역방향은 SQL이 한다**(`normalize_to_requester_perspective`, 0059) —
 *    상대2에서 합성 순서가 반대(`I∘P`)이고 차이가 애드에서만 나므로 두 방향을 한 파일에 섞지 않는다.
 */
export function swapPartnerPerspective(sets: PersonalMatchSetScore[]): PersonalMatchSetScore[] {
    return sets.map((s) => {
        const out: PersonalMatchSetScore = { me: s.me, opp: s.opp }
        if (s.myAd) out.myAd = s.myAd === 'me' ? 'partner' : 'me'
        if (s.oppAd) out.oppAd = s.oppAd
        return out
    })
}

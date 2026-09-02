import type { PersonalMatchSetScore } from '@/types'

/**
 * 상호 확인 대진(match_requests)의 스코어는 요청자 관점으로 저장된다.
 * 받은 요청 카드에서 "내 관점" 미리보기를 그릴 때만 사용하는 표시 전용 헬퍼 —
 * 수락 시 실제 저장 반전은 SECURITY DEFINER RPC(accept_match_request)가 SQL로 수행한다.
 */
export function invertSetScores(sets: PersonalMatchSetScore[]): PersonalMatchSetScore[] {
    return sets.map((s) => ({ me: s.opp, opp: s.me }))
}

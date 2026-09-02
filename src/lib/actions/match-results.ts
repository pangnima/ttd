'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { PersonalMatchSetScore } from '@/types'
import { validateSetScores } from '@/lib/personal-matches/validate-input'
import { recomputePersonalNtrp } from '@/lib/actions/personal-matches'

/**
 * 상호 확인 경기(match_requests 수락 → personal_matches 2행)의 사후 결과(세트) 등록 플로우.
 * 그 행은 RESTRICTIVE RLS로 잠겨 있어 모든 쓰기는 SECURITY DEFINER RPC(0037)로만 이뤄진다.
 *   propose  — 당사자 누구든 세트 제안 (호출자 관점 → RPC가 요청자 관점으로 정규화)
 *   confirm  — 제안자가 아닌 당사자가 승인 → 양측 personal_matches 확정
 *   dispute  — 제안자가 아닌 당사자가 이의 제기 → 재제안 가능
 */

type ActionResult = { error: string | null }

/** RPC가 raise하는 식별자 → 사용자 안내 문구 (acceptMatchRequestAction과 동일 패턴) */
const RESULT_ERROR_MESSAGES: Array<[string, string]> = [
    ['request_not_found', '존재하지 않는 경기입니다.'],
    ['request_not_accepted', '수락된 상호 확인 경기에만 결과를 등록할 수 있습니다.'],
    ['not_request_party', '이 경기의 당사자만 결과를 등록할 수 있습니다.'],
    ['result_already_confirmed', '이미 확정된 결과입니다.'],
    ['result_already_proposed', '상대가 먼저 결과를 제안했습니다. 제안된 결과를 확인해주세요.'],
    ['result_not_proposed', '확인할 결과 제안이 없습니다.'],
    ['cannot_confirm_own_proposal', '본인이 제안한 결과는 직접 확정할 수 없습니다.'],
    ['cannot_dispute_own_proposal', '본인이 제안한 결과에는 이의를 제기할 수 없습니다. 제안을 수정해주세요.'],
    ['counterpart_deleted', '상대가 탈퇴하여 결과를 확정할 수 없습니다.'],
    ['invalid_set_scores', '세트 스코어를 올바르게 입력해주세요.'],
    ['dispute_reason_too_long', '이의 사유는 200자 이내로 입력해주세요.'],
    ['personal_matches_missing', '경기 기록을 찾을 수 없어 확정하지 못했습니다.'],
]

function mapRpcError(message: string, fallback: string): string {
    const known = RESULT_ERROR_MESSAGES.find(([key]) => message.includes(key))
    return known ? known[1] : fallback
}

function revalidateResultPaths() {
    revalidatePath('/me/personal-matches')
    revalidatePath('/me/match-requests')
    revalidatePath('/me/analytics')
}

/** 세트 결과 제안 (신규 제안 · 이의 후 재제안 · 본인 제안 수정). sets는 호출자 관점. */
export async function proposeMatchResultAction(
    requestId: string,
    sets: PersonalMatchSetScore[],
): Promise<ActionResult> {
    const validationError = validateSetScores(sets)
    if (validationError) return { error: validationError }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    // RPC가 me/opp 정수만 남기고 정규화하므로 여분 키(myAd 등)는 보내지 않는다
    const payload = sets.map((s) => ({ me: s.me, opp: s.opp }))
    const { error } = await supabase.rpc('propose_match_result', {
        p_request_id: requestId,
        p_set_scores: payload,
    })
    if (error) return { error: mapRpcError(error.message, '결과 제안에 실패했습니다.') }

    revalidateResultPaths()
    return { error: null }
}

/** 상대 제안 승인 → 양측 personal_matches 확정. 확정 후 본인 개인 NTRP 캐시 갱신(상대는 lazy). */
export async function confirmMatchResultAction(requestId: string): Promise<ActionResult> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const { error } = await supabase.rpc('confirm_match_result', { p_request_id: requestId })
    if (error) return { error: mapRpcError(error.message, '결과 확정에 실패했습니다.') }

    // 확정된 경기가 통계·레이팅에 반영되므로 본인 캐시 재계산 (accept와 동일하게 상대는 다음 CUD에서 갱신)
    await recomputePersonalNtrp(user.id)
    revalidateResultPaths()
    return { error: null }
}

/** 상대 제안에 이의 제기 (사유 선택, 200자). 양측 누구든 다시 제안할 수 있는 disputed 상태로 전이. */
export async function disputeMatchResultAction(requestId: string, reason?: string): Promise<ActionResult> {
    const trimmed = reason?.trim() ?? ''
    if (trimmed.length > 200) return { error: '이의 사유는 200자 이내로 입력해주세요.' }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const { error } = await supabase.rpc('dispute_match_result', {
        p_request_id: requestId,
        p_reason: trimmed || undefined,
    })
    if (error) return { error: mapRpcError(error.message, '이의 제기에 실패했습니다.') }

    revalidateResultPaths()
    return { error: null }
}

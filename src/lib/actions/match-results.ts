'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { PersonalMatchSetScore } from '@/types'
import { validateSetScores } from '@/lib/personal-matches/validate-input'
import { recomputePersonalNtrp } from '@/lib/actions/personal-matches'
import { revalidateRoomPaths } from '@/lib/match-rooms/revalidate'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

/**
 * 상호 확인 경기(match_requests 수락 → personal_matches 2행)의 사후 결과(세트) 등록 플로우.
 * 그 행은 RESTRICTIVE RLS로 잠겨 있어 모든 쓰기는 SECURITY DEFINER RPC(0037)로만 이뤄진다.
 *   propose  — 좌석 누구든 세트 제안 (호출자 관점 → RPC가 요청자 관점으로 정규화). 제안이 곧 제안자의 확인
 *   confirm  — 제안자가 아닌 좌석이 각자 확인 → 활성 회원 좌석 전원이 확인한 순간 관점 행 전부 확정 (0060 만장일치)
 *   dispute  — 제안자가 아닌 좌석이 이의 제기 → 확인 초기화, 재제안 가능
 */

/**
 * `stale` = 내 화면이 본 협상 상태가 서버와 달라서 거부됐다(그 사이에 다른 참가자가 제안·확인·이의했다).
 * 팝업 훅(useResultDialog)이 이 플래그를 보고 router.refresh()로 카드를 최신 상태로 바꾼다 —
 * 팝업은 닫지 않고 에러 문구를 남겨 "왜 내 입력이 거부됐는가"를 읽을 수 있게 한다.
 */
type ActionResult = { error: string | null; stale?: boolean }

/**
 * RPC가 raise하는 식별자 → 사용자 안내 문구 (acceptMatchRequestAction과 동일 패턴).
 * ⚠ 매칭은 `includes`라 한 키가 다른 키의 접두이면(`result_already_confirmed` ⊂ `…_by_seat`) 짧은 쪽이 먼저
 * 걸린다. 그래서 목록을 **키 길이 내림차순**으로 정렬해 둔다 — 항목을 추가할 때 순서를 신경 쓰지 않아도 된다.
 */
const RESULT_ERROR_MESSAGES: Array<[string, string]> = ([
    ['request_not_found', '존재하지 않는 경기입니다.'],
    ['request_not_accepted', '수락된 상호 확인 경기에만 결과를 등록할 수 있습니다.'],
    ['not_request_party', '이 경기에 참가한 회원만 결과를 등록할 수 있습니다.'],
    ['negotiation_not_found', '결과 협상 정보를 찾을 수 없습니다. 화면을 새로고침해주세요.'],
    ['result_already_confirmed', '이미 확정된 결과입니다.'],
    ['result_already_proposed', '다른 참가자가 먼저 결과를 제안했습니다. 제안된 결과를 확인해주세요.'],
    ['result_not_proposed', '확인할 결과 제안이 없습니다. 다른 참가자가 이의를 제기했거나 다시 입력했을 수 있습니다.'],
    ['cannot_confirm_own_proposal', '본인이 제안한 결과는 이미 확인한 것으로 칩니다. 남은 참가자의 확인을 기다려주세요.'],
    ['result_already_confirmed_by_seat', '이미 확인한 결과입니다. 남은 참가자의 확인을 기다려주세요.'],
    ['cannot_dispute_own_proposal', '본인이 제안한 결과에는 이의를 제기할 수 없습니다. 제안을 수정해주세요.'],
    ['counterpart_deleted', '상대팀 회원이 모두 탈퇴하여 결과를 확정할 수 없습니다.'],
    ['invalid_set_scores', '게임 스코어를 올바르게 입력해주세요.'],
    ['dispute_reason_too_long', '이의 사유는 200자 이내로 입력해주세요.'],
    ['personal_matches_missing', '경기 기록을 찾을 수 없어 확정하지 못했습니다.'],
    ['perspective_row_missing', '참가자 기록 일부가 없어 확정하지 못했습니다.'],
    ['result_not_confirmed', '아직 확정되지 않은 결과입니다.'],
] as Array<[string, string]>).sort((a, b) => b[0].length - a[0].length)

/** 내 화면이 낡아서 거부된 코드들 — 동시 입력의 다른 한쪽이 먼저 도착했을 때 */
const STALE_KEYS = new Set([
    'result_already_proposed', 'result_not_proposed', 'result_already_confirmed',
    'result_already_confirmed_by_seat', 'negotiation_not_found',
])

function mapRpcError(message: string, fallback: string): ActionResult {
    const known = RESULT_ERROR_MESSAGES.find(([key]) => message.includes(key))
    if (!known) return { error: fallback }
    return { error: known[1], stale: STALE_KEYS.has(known[0]) }
}

function revalidateResultPaths(viewerId: string, roomId?: string | null) {
    revalidatePath('/me/personal-matches')
    revalidatePath('/me/match-requests')
    // 통계 화면은 /profile/[userId] — /me/analytics는 리다이렉트 전용이라 무효화 대상이 아니다
    revalidatePath(`/profile/${viewerId}`)
    // 방 게임·로테이션 게임의 요청에는 room_id가 채워져 있다(0049·0050) — 결과가 바뀌면 방 정산도 재계산된다
    revalidateRoomPaths(roomId)
}

/**
 * 이 요청이 매칭 룸에 속하는지 — 무효화 경로를 알기 위한 조회.
 * match_requests SELECT는 이 경기의 참가자에게만 열려 있어(0040·0052) 남의 방을 들여다볼 수 없다.
 */
async function resolveRequestRoomId(
    supabase: SupabaseClient<Database>,
    requestId: string,
): Promise<string | null> {
    const { data } = await supabase
        .from('match_requests')
        .select('room_id')
        .eq('id', requestId)
        .maybeSingle()
    return data?.room_id ?? null
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

    // me/opp + (복식) 세트별 애드/듀스만 전달 — RPC가 정규화하며 단식이면 애드 키를 버린다
    const payload = sets.map((s) => ({
        me: s.me,
        opp: s.opp,
        ...(s.myAd ? { myAd: s.myAd } : {}),
        ...(s.oppAd ? { oppAd: s.oppAd } : {}),
    }))
    const { error } = await supabase.rpc('propose_match_result', {
        p_request_id: requestId,
        p_set_scores: payload,
    })
    if (error) return mapRpcError(error.message, '결과 제안에 실패했습니다.')

    revalidateResultPaths(user.id, await resolveRequestRoomId(supabase, requestId))
    return { error: null }
}

/**
 * 제안 결과에 내 좌석의 확인을 더한다. 활성 회원 좌석 전원이 확인한 순간(RPC가 true를 돌려준다)
 * 관점 행 전부가 확정되므로 그때만 본인 개인 NTRP 캐시를 갱신한다(나머지 좌석은 lazy).
 */
export async function confirmMatchResultAction(requestId: string): Promise<ActionResult & { settled?: boolean }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const { data: settled, error } = await supabase.rpc('confirm_match_result', { p_request_id: requestId })
    if (error) return mapRpcError(error.message, '결과 확인에 실패했습니다.')

    // 정산된 경기만 통계·레이팅에 반영되므로 마지막 확인일 때만 본인 캐시 재계산 (나머지 좌석은 다음 CUD에서 갱신)
    if (settled) await recomputePersonalNtrp(user.id)
    revalidateResultPaths(user.id, await resolveRequestRoomId(supabase, requestId))
    return { error: null, settled: !!settled }
}

/** 제안에 이의 제기 (사유 선택, 200자). 확인이 초기화되고 좌석 누구든 다시 제안할 수 있는 disputed 상태로 전이. */
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
    if (error) return mapRpcError(error.message, '이의 제기에 실패했습니다.')

    revalidateResultPaths(user.id, await resolveRequestRoomId(supabase, requestId))
    return { error: null }
}

/**
 * 확정된 결과를 다시 협상 상태로 되돌린다(0055). 확정 후 오입력을 고칠 유일한 경로다 —
 * 상호 확인 경기의 personal_matches는 RESTRICTIVE 정책으로 소유자도 직접 수정할 수 없다.
 * 되돌리면 양측(복식이면 참가자 전원) 기록이 미확정으로 돌아가 확인 요청 허브에 다시 나타나고,
 * 직전 확정값이 제안값으로 남아 재제안 다이얼로그에 프리필된다.
 */
export async function reopenMatchResultAction(requestId: string, reason?: string): Promise<ActionResult> {
    const trimmed = reason?.trim() ?? ''
    if (trimmed.length > 200) return { error: '정정 사유는 200자 이내로 입력해주세요.' }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const { error } = await supabase.rpc('reopen_match_result', {
        p_request_id: requestId,
        p_reason: trimmed || undefined,
    })
    if (error) return mapRpcError(error.message, '결과 정정에 실패했습니다.')

    revalidateResultPaths(user.id, await resolveRequestRoomId(supabase, requestId))
    return { error: null }
}

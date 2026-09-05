import type { MatchResultStatus, PersonalMatchConfirmation, PersonalMatchSetScore } from '@/types'
import { invertSetScores } from '@/lib/personal-matches/perspective'

/** match_requests에서 결과 확인 상태를 만들 때 필요한 최소 컬럼 (queries/personal-matches가 select) */
export type ConfirmationSourceRow = {
    id: string
    requester_id: string
    /** 상대팀 대표 확인자. 이 둘 중 하나가 viewer여야 제안·확인·이의를 할 수 있다(RPC not_request_party) */
    opponent_user_id: string
    result_status: string
    proposed_by: string | null
    proposed_set_scores: unknown
    dispute_reason: string | null
}

/**
 * match_requests 행을 보는 사람(viewer) 관점의 PersonalMatchConfirmation으로 변환한다.
 * proposed_set_scores는 요청자 관점으로 저장되므로 viewer가 상대(opponent)면 반전한다.
 * viewerIsParty는 요청 당사자 여부 — 복식 파트너·상대2는 협상 행을 읽더라도(0052) 액션 자격이 없다.
 */
export function buildConfirmation(row: ConfirmationSourceRow, viewerId: string): PersonalMatchConfirmation {
    const proposed = Array.isArray(row.proposed_set_scores)
        ? (row.proposed_set_scores as PersonalMatchSetScore[])
        : []
    return {
        requestId: row.id,
        status: row.result_status as MatchResultStatus,
        proposedByMe: row.proposed_by === viewerId,
        proposedSets: row.requester_id === viewerId ? proposed : invertSetScores(proposed),
        disputeReason: row.dispute_reason ?? undefined,
        viewerIsParty: row.requester_id === viewerId || row.opponent_user_id === viewerId,
    }
}

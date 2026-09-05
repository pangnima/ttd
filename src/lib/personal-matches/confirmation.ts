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
 * viewerIsParty는 요청 당사자 여부 — 복식 파트너·상대2는 협상 행을 읽지만(0052) 액션 자격이 없다.
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

/** 요청 당사자가 아닌 참가자에게 보여줄 대기 배지 (문구 + 툴팁) */
export type BystanderWaitingBadge = { label: string; title: string }

const REP_WAITING: BystanderWaitingBadge = {
    label: '대표 확인 대기',
    title: '이 경기의 결과는 작성자와 상대 대표가 확인하면 확정됩니다',
}

/**
 * 복식 파트너·상대2(요청 당사자가 아닌 참가자)의 관점 행에 붙는 읽기 전용 배지.
 *
 * 0052로 이들도 협상 행을 '읽을 수' 있게 되면서 *아무도 제안하지 않았는지 / 제안돼서 대표 확인만
 * 남았는지 / 이의로 되돌아갔는지*를 구분해 보여준다. 액션 자격은 여전히 없다(viewerIsParty=false).
 * confirmation이 없으면(0052 이전 데이터 경로·읽기 실패) 종전 문구로 폴백한다 — 전후 호환.
 */
export function bystanderWaitingBadge(c?: PersonalMatchConfirmation): BystanderWaitingBadge {
    if (!c) return REP_WAITING
    if (c.status === 'none') {
        return { label: '결과 입력 대기', title: '아직 아무도 결과를 제안하지 않았습니다' }
    }
    if (c.status === 'disputed') {
        return {
            label: '이의 제기됨',
            title: c.disputeReason ?? '제안된 결과에 이의가 제기돼 다시 입력을 기다립니다',
        }
    }
    if (c.status === 'proposed') {
        return { label: '대표 확인 대기', title: '결과가 제안됐습니다. 상대팀 대표가 확인하면 확정됩니다' }
    }
    // confirmed인데 세트가 비어 있는 조합은 존재할 수 없다 — 방어적 폴백
    return REP_WAITING
}
